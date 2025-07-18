# Provisioning AWS IoT Core Certificates for Ec-2 instance for MQTT Broker with Terraform 

In my previous notes, we talked about how to use AWS IoT Core, in particular MQTT to achieve a bidirectional secure communication between raspberry pi and web servers. In [Provisioning AWS IoT Core Certificates for Raspberry Pi for MQTT Broker with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-for-raspberry-pi), we talked about how to provision certificates and install them on the raspberry pi device. But how to do that on EC-2 for web server? 

In MQTT, there is usually a publisher and a subscriber. We have covered the published (Raspberry pi), so this note will dive into setting everything up securely for the subscriber. In this case subscriber will be our typical web server - a machine in a private network. So let's dive in. 

In this guide, we will provision an EC-2 instance in private network, AWS IOT Core SSL Certificate, and install them on the machine as environment variable using AWS Secrets Manager.


## Provisioning Certificates for AWS IOT Core EC-2 instance

This part is pretty much identical to the one we did for raspberry pi. So please read [Provisioning AWS IoT Core Certificates for Raspberry Pi for MQTT Broker with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-for-raspberry-pi) before moving on.

## Installing Certificates on Ec-2

Our EC-2 is a docker image deployed using `user_data` provisioned on ec-2 with terraform. I will not dive into details about how to provision EC-2, because this note of mine describes it pretty well, so feel free to familiarize yourself in [Provisioning EC-2 Instance on Terraform using Modules and best practices](https://www.viktorvasylkovskyi.com/posts/terraform-modularizing). Moreover, we are going to be setting secrets in AWS Secrets Manager, so if you are not familiar with how this is done, please refer to [Provision AWS Secret Manager and Store Secrets Securely](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-secret-manager-and-securing-secrets).

Our EC-2 is setup using `user_data` script as follows: 

```hcl
module "ec2" {
  ...
  user_data = <<-EOF
            #!/bin/bash
            sudo apt-get update -y
            sudo apt-get install -y docker.io
            sudo systemctl start docker
            sudo systemctl enable docker

            # Add user to docker group
            sudo usermod -aG docker $USERNAME

            docker network create docker-internal-network

            sudo docker run -d --name web-service --network docker-internal-network -p 4000:4000 \
              -e DB_USER=${module.secrets.secrets.postgres_database_username} \
              your-docker-username/your-docker-image:${var.docker_image_hash}
            EOF
}
```

### Writing SSH Script to convert Certificate data into Base64

We are going to store the certificates in AWS Secrets Manager as secret strings. Certificate data is better stored this way as a `base64` string, so let's write the script to convert certificates. We are assuming here that you already provisioned certificates following the steps from the previous notes on [Provisioning AWS IoT Core Certificates for Raspberry Pi for MQTT Broker with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-for-raspberry-pi). 


```sh
#!/bin/bash

set -euo pipefail

# Read and encode each piece
CERT=$(terraform output -raw iot_thing_video_service_web_certificate_pem | base64 | tr -d '\n')
KEY=$(terraform output -raw iot_thing_video_service_web_private_key | base64 | tr -d '\n')
ROOT_CA=$(curl -sS https://www.amazontrust.com/repository/AmazonRootCA1.pem | base64 | tr -d '\n')

# Print as JSON
cat <<EOF
{
  "certificate_pem": "$CERT",
  "private_key": "$KEY",
  "amazon_root_ca": "$ROOT_CA"
}
EOF
```

This will print the certificates to stdout. Copy the names and upload the secrets to AWS Secrets manager using the following env vars: 

```sh
AWS_IOT_CERT_BASE64=
AWS_IOT_KEY_BASE64=
AWS_IOT_ROOT_CERT_BASE64=
```

Note, we will also need to provide the `client_name`, `iot_endpoint` and `iot_topic` to successfully subscribe, we can define them as well as env variables. They may be secrets as well: 

```sh
AWS_IOT_CORE_ENDPOINT=
AWS_IOT_CLIENT_ID=
AWS_IOT_MQTT_TOPIC=
```

Finally, MQTT does not read the certificate inline, so we will need to write them into filesystem at some point. So for now we will only define where is this location via environment variables. If it is a docker container, then we might as well put them into `/tmp` folder: 

```sh
AWS_IOT_PATH_TO_CERT="/tmp/aws_iot/device.pem.crt"
AWS_IOT_PATH_TO_KEY="/tmp/aws_iot/private.pem.key"
AWS_IOT_PATH_TO_ROOT_CERT="/tmp/aws_iot/AmazonRootCA1.pem"
```

## Updating Env variables in EC-2 user_data

Finally, we just need to update the EC-2 docker container instantiation with the new environment variables like follows. Note the environment variables will pull the values from the AWS Secrets Manager: 


```hcl
module "ec2" {
  ...
  user_data = <<-EOF
            #!/bin/bash
            sudo apt-get update -y
            sudo apt-get install -y docker.io
            sudo systemctl start docker
            sudo systemctl enable docker

            # Add user to docker group
            sudo usermod -aG docker $USERNAME

            docker network create docker-internal-network

            sudo docker run -d --name web-service --network docker-internal-network -p 4000:4000 \
              -e AWS_IOT_CORE_ENDPOINT=${module.secrets.secrets.aws_iot_core_endpoint} \
              -e AWS_IOT_CLIENT_ID=${module.secrets.secrets.aws_iot_client_id} \
              -e AWS_IOT_MQTT_TOPIC=${module.secrets.secrets.aws_iot_mqtt_topic} \
              -e AWS_IOT_CERT_BASE64=${module.secrets.secrets.aws_iot_cert_base64} \
              -e AWS_IOT_KEY_BASE64=${module.secrets.secrets.aws_iot_key_base64} \
              -e AWS_IOT_ROOT_CERT_BASE64=${module.secrets.secrets.aws_iot_root_cert_base64} \
              -e AWS_IOT_PATH_TO_CERT=${module.secrets.secrets.aws_iot_path_to_cert} \
              -e AWS_IOT_PATH_TO_KEY=${module.secrets.secrets.aws_iot_path_to_key} \
              -e AWS_IOT_PATH_TO_ROOT_CERT=${module.secrets.secrets.aws_iot_path_to_root_cert} \
              your-docker-username/your-docker-image:${var.docker_image_hash}
            EOF
}
```

## Conclusion

And that is it, the certificates are now available on the web server. The last things to do is to write actual python code that will use the certificates as base64. We will cover that in our last notes, which covers that and how to setup MQTT connection and publish/subscribe to messages. Deep dive into that at - [AWS IoT Core - Implementing Publisher and Subscriber for MQTT in Python](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-python-implementation). 
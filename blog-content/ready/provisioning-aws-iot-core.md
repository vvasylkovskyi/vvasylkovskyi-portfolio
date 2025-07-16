# Provisioning AWS IoT Core for MQTT Broker with Terraform

Recently I have been developing my IoT project where I have a device and a couple of web servers that need to intercommunicate. During this process, I have tried alot of different things: 

  - Running Raspberry Pi behind reverse proxy using terraform, and expose it publicly through ec2. This poses security concerns because we expose the device to the public network, plus it is not very scalable. Although an interesting read and I found it useful for debugging and dev. You can have a read on this: [Deploying EC2 as Remote Proxy for Raspberry Pi using Terraform and Ansible](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-as-remote-proxy-for-raspberry-pi).

Next, I tried to shift, and instead of making my servers talk to raspberry pi, the device became push oriented, in the sense, it sends the data to the server proactively instead of waiting to be connected. I haven't documented it, but I can say that it is surely a fast and production-ready use case. The main drawback of this approach is high coupling between the web service and a device, so whenever a server is updated it may break the device. From security point of view, I still didn't have a way to verify whether the device contacting my raspberry pi was a web server and vice-versa.

It was at this time that I researched about MQTT - a centralized event-based broker in IoT world. MQTT solves the tight coupling problem and security by using publish-subscribe model and SSL certificates distribution. Moreover, AWS IoT Core is a managed MQTT that is easy to setup. So I want to share my experience here, and hopefully it will drive you forward to adopt more of publish-subscribe event based systems. It surely helped me!

## Overview

To enable this web MQTT server we will provision the following:

  - Create an IoT Thing - represents our Raspberry Pi
  - Create an X.509 certificate
  - Create an IoT Policy that allows publishing to a topic
  - Attach the policy and certificate to the Thing
  - Output all necessary certs/keys we will need on our Pi

Further, we will need to manually add connection in our device code to use all these resources and connect to mqtt. We will do that using python and AWS Client.

## Provision a Thing, IoT Policy and Certificate and keys

So, let's retrieve all this information for our raspberry pi using terraform: 

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_iot_thing" "thing" {
  name = "raspberry-pi-camera"
}

resource "aws_iot_policy" "publish_policy" {
  name = "RaspberryPiPublishPolicy"
  policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "iot:Connect",
          "iot:Publish"
        ],
        "Resource": "*"
      }
    ]
  })
}

data "aws_iot_endpoint" "iot_endpoint" {
  endpoint_type = "iot:Data-ATS"
}

resource "aws_iot_certificate" "device_cert" {
  active = true
}
resource "aws_iot_thing_principal_attachment" "attach_cert" {
  thing       = aws_iot_thing.thing.id
  principal   = aws_iot_certificate.device_cert.arn
}

resource "aws_iot_policy_attachment" "attach_policy" {
  policy     = aws_iot_policy.publish_policy.name
  target     = aws_iot_certificate.device_cert.arn
}
```

That boilerplate code will provision all the necessary security assets that we will provide to our device so that it can interact with AWS IoT Core MQTT. Let's output them: 

### Add outputs

```hcl
output "certificate_pem" {
  value     = aws_iot_certificate.device_cert.certificate_pem
  sensitive = true
}

output "private_key" {
  value     = aws_iot_certificate.device_cert.private_key
  sensitive = true
}

output "public_key" {
  value     = aws_iot_certificate.device_cert.public_key
  sensitive = true
}

output "certificate_arn" {
  value = aws_iot_certificate.device_cert.arn
}

output "iot_endpoint" {
  value = data.aws_iot_endpoint.iot_endpoint.endpoint_address
}
```

Run `terraform init` and `terraform apply --auto-approve`. You should see output like this:

```sh
Apply complete! Resources: 5 added, 0 changed, 0 destroyed.

Outputs:

certificate_arn = "arn:aws:iot:...."
certificate_pem = <sensitive>
iot_endpoint = "domain.iot.us-east-1.amazonaws.com"
private_key = <sensitive>
public_key = <sensitive>
```

## Write Shell Script to extract SSL credentials into files

Now we have the certificates and keys in our terraform state, but we need to have them as a file and put on raspberry pi. Here is the mapping of items from terraform state to the file names:

  - device.pem.crt ← from certificate_pem 
  - private.pem.key ← from private_key 
  - AmazonRootCA1.pem ← download from: https://www.amazontrust.com/repository/AmazonRootCA1.pem

We can extract them using shell script. Let's write it: 

```sh
#!/bin/bash

set -euo pipefail

OUTPUT_DIR="../aws_iot_ssl_credentials"

mkdir -p "$OUTPUT_DIR"

echo "Saving device.pem.crt..."
terraform output -raw certificate_pem > "$OUTPUT_DIR/device.pem.crt"

echo "Saving private.pem.key..."
terraform output -raw private_key > "$OUTPUT_DIR/private.pem.key"

# Optional: save public key
# echo "Saving public.pem.key..."
# terraform output -raw public_key > "$OUTPUT_DIR/public.pem.key"

echo "Downloading AmazonRootCA1.pem..."
curl -sS https://www.amazontrust.com/repository/AmazonRootCA1.pem -o "$OUTPUT_DIR/AmazonRootCA1.pem"

echo "Setting correct permissions..."
chmod 600 "$OUTPUT_DIR/private.pem.key"
chmod 644 "$OUTPUT_DIR/"*.pem*

echo "✅ Certificate files saved in $OUTPUT_DIR"
```

Note, we are going to output into the folder `aws_iot_ssl_credentials` which is a name we are going to have to remember to use later in our ansible script, that will upload them onto raspberry pi. Also not that we are using `terraform output -raw` with `-raw` to ensure that the sensitive outputs are handled correctly and without errors. My first impulse was to use `-json` but the `.pem` files are not json ...dah! 

Finally, the AWS Root CA1 is downloaded remotely. 

## Deploy the assets to Raspberry Pi using Ansible

Now we have all the assets, lets set them to raspberry pi. We can automate it using ansible, which allows us to have a reproducible setup. The goal is to place the sensitive data onto our RaspberryPi, so that it can use them when connecting using MQTT. We will create a folder `aws-iot` at the user root folder in raspberry pi: `/home/pi/aws-iot`, and write a script that just passes the files from this local folder onto the pi. In the end the original certificate files are destroyed to ensure they will not be leaked. 

```bash
/home/pi/aws-iot/
├── device.pem.crt       # Device certificate
├── private.pem.key      # Private key
├── AmazonRootCA1.pem    # Amazon root CA
```

Let's write ansible script: 

```yml
---
- name: Upload AWS IoT certificates to Raspberry Pi
  hosts: raspberrypi
  become: true
  vars:
    aws_iot_local_path: "{{ playbook_dir }}/aws_iot_ssl_credentials"
    aws_iot_remote_path: "/home/pi/aws_iot"
    target_user: pi

  tasks:
    - name: Ensure remote directory exists
      file:
        path: "{{ aws_iot_remote_path }}"
        state: directory
        owner: "{{ target_user }}"
        group: "{{ target_user }}"
        mode: '0755'

    - name: Upload device certificate
      copy:
        src: "{{ aws_iot_local_path }}/device.pem.crt"
        dest: "{{ aws_iot_remote_path }}/device.pem.crt"
        owner: "{{ target_user }}"
        group: "{{ target_user }}"
        mode: '0644'

    - name: Upload private key
      copy:
        src: "{{ aws_iot_local_path }}/private.pem.key"
        dest: "{{ aws_iot_remote_path }}/private.pem.key"
        owner: "{{ target_user }}"
        group: "{{ target_user }}"
        mode: '0600'

    - name: Upload Amazon Root CA
      copy:
        src: "{{ aws_iot_local_path }}/AmazonRootCA1.pem"
        dest: "{{ aws_iot_remote_path }}/AmazonRootCA1.pem"
        owner: "{{ target_user }}"
        group: "{{ target_user }}"
        mode: '0644'
```

Make sure the you `aws_iot_local_path` and `aws_iot_remote_path` are correct. Run the script using ansible: `ansible-playbook -i inventory/all.yml playbooks/playbook.yml --vault-password-file .vault_pass.txt`


## Install AWS IoT Device SDK and adding connection using Python

Now that we have all infrastructure in place, the next step is to add the capability for the device to actually connect to that infrastructure. We will be adding AWS IOT SDK to our python app. This python app is meant to run on the Rpi - I will omit the steps on how to set this up, as there are many places this can be read about.

### Adding dependencies

First we need to add dependencies

```sh
pip install awsiotsdk
```

Or another method that you prefer, I have added it using `poetry` in my `pyproject.toml`:

```sh
[tool.poetry.dependencies]
awsiotsdk = "1.24.0"
```

The official place to get it is here in PyPi - https://pypi.org/project/awsiotsdk/.



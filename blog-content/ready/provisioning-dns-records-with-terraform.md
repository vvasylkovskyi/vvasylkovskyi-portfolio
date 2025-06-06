# Provision DNS records with Terraform

In the previous notes we talked about how to setup the ec2 instance inside of the VPC on the subnet. We managed to access to this instance via SSH by providing ssh key in security groups. All is fine and dandy until now, but when we want to run a real application, we want to expose it on HTTP (and later HTTPS).

In this note, I will walk you through how to do it using terraform. In practice, we will spawn a simple http server on our ec2 instance, and provide `Route53` DNS records to access to this application, so that we will move from:

```bash
http://ec2-52-70-0-203.compute-1.amazonaws.com/
```

to actual domain that you own like

```bash
https://www.vvasylkovskyi.com
```

Let's dive in

## Spawn HTTP server on ec2 instance

in your `ec2.tf` add the following:

```tf
resource "aws_instance" "app" {
  ... your instance previous code ...
  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y || sudo apt-get update -y
              sudo yum install -y python3 || sudo apt-get install -y python3
              echo "<html><body><h1>Hello from Terraform EC2!</h1></body></html>" > index.html
              nohup python3 -m http.server 80 &
              EOF
}
```

In `outputs.tf` add the following:

```tf
output "ec2_ip_address" {
  value       = aws_eip.portfolio.public_ip
  description = "The Elastic IP address allocated to the EC2 instance."
}

output "ec2_http_url" {
  value       = "http://${aws_instance.portfolio.public_dns}"
  description = "The public DNS-based HTTP URL to access the EC2 instance."
}
```

The `user_data` is a cool utility in aws that allows us to bake in ec2 some bootstrap code. In this example we start a server using python that is a simple `<html><body><h1>Hello from Terraform EC2!</h1></body></html>` static page. Run `terraform apply --auto-approve`.

See the output:

```bash
ec2_http_url = "http://url.compute-1.amazonaws.com"
ec2_ip_address = <IP>
```

Navigate to `ec2_http_url` and see website opening

![alt text](./provisioning-dns-records-with-terraform/terraform-ec2-server.png)

## Adding Route53 records

Next step, to create DNS records we actually have to create a hosted zone first. Lets begin our `route53.tf`

```tf
# route53.tf
resource "aws_route53_zone" "main" {
  name = "your-domain.com"
}
```

Run `terraform apply --auto-approve` and navigate to [Route 53 Hosted Zones](https://us-east-1.console.aws.amazon.com/route53/v2/hostedzones) and confirm that your hosted zone was created.

### Updating DNS Registrar

At this point, there is a manual step where we actually have to go to the web and click our way through. We need to ensure that our DNS registrar has namespaces of our hosted zone from route 53. You may be familiar with the process of updating NS records in your registrar, however, for full integration with AWS, here I will walk through how to transfer your domain to Route53 from your current registrar.

Your registrar can be anyone from GoDaddy, Cloudflared, DigitalOcean etc. (yes I had them all). So I leave you figure out how to find your DNS management in the registrar. Once you get there, next step is to move the DNS management to Route53

TODO

### Update DNS NameSpace records in your DNS registrar

The new Route53 zone that we created using terraform above can be found in the [Hosted Zones](https://us-east-1.console.aws.amazon.com/route53/v2/hostedzones#). Open the zone and find the `NS` records.

Next step is to copy those `NS` records and add them one by one into DNS registrar of your choice. These `NS` records essentially are addresses that will know how to find that DNS records of Route53.

### Add new DNS record

Once this is done we can proceed and add new DNS record using terraform:

```tf
# route53.tf
resource "aws_route53_zone" "main" {
  name = "your-domain.com"
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.your-domain.com"
  type    = "A"
  ttl     = 60
  records = [aws_eip.portfolio.public_ip]
}
```

Above we are creating a DNS record of type `A` which is a type that assigns DNS name to Ipv4 IP address. Note that in this example we are using `EIP` which are fixed IP, to avoid the issues with dynamic IP addresses. This way we make sure that even if the EC2 instance is restarted, and receives new private IP, we still keep same fixed public IP. Lets apply and test `terraform apply --auto-approve`.

**Note**, check if the name servers got applied. Sometimes it takes a while for your changes to take effect. You can check by running:

```bash
dig +short NS your-domain.com
```

And compare the name servers if they are correct. Once they are correct, your DNS should be applied. Visit `www.your-domain.com` and see it showing our demo app!

## Conclusion

And that is a wrap! Now we have the DNS records pointing to our Ec2 instance. Next, let's explore about how to add SSL to this domain and enable HTTPS.

#!/bin/bash
sudo yum update -y || sudo apt-get update -y
sudo yum install -y python3 || sudo apt-get install -y python3
DD_API_KEY=${datadog_api_key} DD_SITE="datadoghq.eu" bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)" &
echo "<html><body><h1>Hello from Terraform EC2!</h1></body></html>" > index.html
nohup python3 -m http.server 80 &
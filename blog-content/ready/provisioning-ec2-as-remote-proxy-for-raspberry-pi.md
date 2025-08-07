# Deploying EC2 as Remote Proxy for Raspberry Pi using Terraform and Ansible

Hi! I’m very excited to write this as I just finished successfully accessing my Raspberry Pi over the internet — and fully automated the process using `Terraform` and `Ansible`.

The idea behind this setup is to use a reverse proxy to expose a Raspberry Pi that’s sitting behind a NAT or home router. A reverse proxy is basically a server that accepts requests from the internet and forwards them to another machine on the private network (in our case, the Pi). This way, your Raspberry Pi can stay safely hidden behind your router while still being accessible via a nice domain name like `rpi.your-domain.com`.

Initially, I tried doing this with `Cloudflare Tunnels`, which work pretty well for manual setups. You can read about it here: [Expose Your Raspberry Pi to the Internet with Cloudflare Tunnel](https://www.viktorvasylkovskyi.com/posts/expose-rpi-to-public-network-using-cloudfare-tunnel). However, I hit a wall trying to manage it cleanly using infrastructure as code — especially when I wanted to integrate it with existing Terraform-managed resources. So I did a bit of hacking, and what came out of it is this really neat solution that uses an EC2 instance as a relay between the public internet and the Raspberry Pi — all automated and reproducible.

Let’s walk through how to do it!

## Prerequisites

We assume good level of knowledge here of terraform, but if want to learn, there are lots of great notes of mine you can read to reach the setup we will propose here. 

  - [Provisioning EC-2 Instance on Terraform using Modules and best practices](https://www.viktorvasylkovskyi.com/posts/terraform-modularizing)
  - [Provisioning Application Load Balancer and connecting it to ECS using Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-alb-and-connecting-to-ecs)

## Goals

Essentially what we are going to do here is the following: 

  - Setup the Load Balancer, HTTPS, DNS and EC-2 using the [Prerequisites section](#prerequisites). 
  - The EC-2 `user_data` will be modified here to server Nginx Reverse Proxy
  - The RaspberryPi will connect to EC-2 reverse proxy using `Ansible`


### Making EC-2 a Reverse Proxy

Once we have provisioned the EC-2, we have to make it a reverse proxy. Here is the user data for that 

```hcl
module "ec2" {
...
  user_data = <<-EOF
            #!/bin/bash
            # Update packages
            sudo apt-get update -y

            sudo apt-get install -y nginx

            # Start and enable nginx service
            sudo systemctl start nginx
            sudo systemctl enable nginx

            # Configure reverse proxy
            sudo tee /etc/nginx/conf.d/reverse_proxy.conf > /dev/null <<EOL
            server {
                listen 80;
                server_name www.viktorvasylkovskyi.com;

                location / {
                    proxy_pass http://localhost:8080;
                    proxy_set_header Host \$host;
                    proxy_set_header X-Real-IP \$remote_addr;
                    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto \$scheme;
                }
            }
            EOL

            # Reload nginx to apply config
            sudo systemctl reload nginx

            EOF
```

This essentially sets the reverse proxy to listen at port 80, we assume that your DNS setup is going to point to load balancer at port 443 for HTTPS, and load balancer forwards requests to port 80 on EC-2. Then with the setup above the EC-2 is ready to reverse proxy to whoever is at the port 8080. 

Finally we need to connect to raspberry pi and connect to the port 8080. 

### Raspberry Pi to connect to reverse proxy

We can test this manually and connect to port 8080. From you RaspberryPi run: 


```sh
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null  -N -R 8080:localhost:80 <ec2-user>@<ec2-IP>
```

Note this is not the most secure setup but the one that works. Let me know if you know of a more secure one in the comments bellow!

## Automating setup with Ansible

With Ansible we can streamline the process so that the raspberry pi connects to that reverse proxy everytime it is started. To make the above access secure we need SSH key so we will write few playbook rules: 

  - Create playbook to generate SSH Key on Raspberry Pi and copy the public key
  - Set the public key on the EC-2 instance
  - Create playbook to connect to EC-2 reverse proxy using the key created

### Create playbook to generate SSH Key on Raspberry Pi

We are going to generate a new ssh key on Rpi and save the public key locally on our machine (the one running the scripts, not the raspberry pi). The idea is to leave the private key inside of raspberry pi, and then put the public key into the remote ec-2 instance so that when both machines are ready, raspberry pi can connect to the ec2 via ssh as a reverse proxy.

Here is the ansible code: 

```yml
- name: Ensure .ssh directory exists
  file:
    path: /home/{{ ansible_user }}/.ssh
    state: directory
    owner: "{{ rpi_user }}"
    group: "{{ rpi_user }}"
    mode: '0700'

- name: Generate SSH key pair if it doesn't exist
  community.crypto.openssh_keypair:
    path: "{{ ssh_key_path }}"
    type: rsa
    size: 2048
    owner: "{{ rpi_user }}"
    group: "{{ rpi_user }}"
    mode: '0600'
  register: keygen_result

- name: Read public key from Raspberry Pi
  slurp:
    src: "{{ ssh_key_path }}.pub"
  register: public_key_contents

- name: Decode public key
  set_fact:
    public_key: "{{ public_key_contents.content | b64decode }}"

- name: Save public key to local file for Terraform
  copy:
    content: "{{ public_key }}"
    dest: "{{ local_pubkey_path }}"
  delegate_to: localhost
  become: false
```

The variables `local_pubkey_path` is the path in your machine where the public key has to be for the terraform script to pick it up. The `ssh_key_path` is the name of the key itself, you can give it anyname. 

After running this script, in my case with `ansible-playbook -i inventory/all.yml playbooks/playbook.yml --vault-password-file .vault_pass.txt`, you should have the ssh key and be ready to run the terraform script to create your ec2 reverse instance 

### Run terraform script to create remote instance with the right key

The terraform code I used for my instance is the same as above, with the ssh key as variable: 

```hcl
module "ec2" {
  source              = "git::https://github.com/vvasylkovskyi/viktorvasylkovskyi-infra.git//modules/ec2?ref=main"
  ...
  ssh_public_key      = file("~/.ssh/${var.ssh_public_key_name}.pub")
  ssh_public_key_name = var.ssh_public_key_name

  user_data = <<-EOF
  ... same user data as above 
```

Now apply and run with `terraform init` and `terraform apply --auto-approve`. When the script is successful, you should see the output in the console like: 

```sh
Apply complete! Resources: 2 added, 2 changed, 3 destroyed.

Outputs:

ec2_domain_name = "raspberry4b.your-domain.com"
ec2_ip_address = "ec2-ip-address"
```

One last step remains, activate the reverse proxy: 

### Activate Reverse proxy from raspberry pi

Lets write the ansible script to activate the reverse proxy on our raspberry pi: 


```yml


- name: Ensure OpenSSH client is installed
  apt:
    name: openssh-client
    state: present
  when: ansible_os_family == "Debian"

- name: Create systemd service for reverse SSH tunnel
  copy:
    dest: "/etc/systemd/system/{{ systemd_service_name }}"
    content: |
      [Unit]
      Description=Reverse SSH Tunnel to EC2
      After=network.target

      [Service]
      ExecStart=/usr/bin/ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {{ ssh_key_path }} -N -R {{ remote_port }}:localhost:{{ local_port }} {{ ec2_user }}@{{ ec2_ip }}
      Restart=always
      RestartSec=10

      [Install]
      WantedBy=multi-user.target
    mode: '0644'

- name: Reload systemd
  systemd:
    daemon_reload: yes

- name: Enable and start reverse SSH tunnel
  systemd:
    name: "{{ systemd_service_name }}"
    enabled: yes
    state: started

- name: Restart reverse SSH tunnel
  systemd:
    name: "{{ systemd_service_name }}"
    state: restarted
```

We are creating the reverse tunnel systemd service. Systemd service can be activated which guarantees to us that this service will run on device boot. Also we are providing some variables like that you should have available for the script to run. Make sure to define them at the higher level in playbook.

Execute script by running `ansible-playbook -i inventory/all.yml playbooks/playbook.yml --vault-password-file .vault_pass.txt`. 

Observe your web server working on your host now!

## Conclusion

And that's it! 🎉 You've now got a Raspberry Pi securely and reliably exposed to the internet using a remote EC2 instance as a reverse proxy — all set up through Infrastructure as Code with Terraform and Ansible.

This setup is modular, reproducible, and gets you from zero to remote access with a clean, maintainable workflow. It's not only a great way to learn the power of automation and orchestration tools, but also a practical solution for working with devices behind NAT or dynamic IPs.

If you're building home labs, experimenting with IoT, or just love the idea of managing infrastructure properly — this is a super fun and useful project to have in your toolbelt.

Thanks for following along, and as always, feel free to reach out or drop a comment if you have questions or improvements in mind. Happy hacking! 🛠️💻🌐
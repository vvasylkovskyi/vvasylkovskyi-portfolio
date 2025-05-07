# Expose Your Raspberry Pi to the Internet with Cloudflare Tunnel

Exposing local applications (like your Next.js app running on a Raspberry Pi) to the internet can be messy. You usually have to deal with port forwarding, dynamic IP addresses, or carrier-grade NAT — none of which are ideal.

Luckily, **Cloudflare Tunnel** makes this painless. It's secure, fast, and removes the need for any router configuration. This guide walks you through setting it up step-by-step.

## Why Cloudflare Tunnel?

- **No port forwarding**
- **No static IP required**
- **Works behind NATs**
- **Free TLS/SSL certificates**
- **Super low latency via Cloudflare’s global network**

## SSL/TLS Certificates — Handled for You

Cloudflare automatically issues and manages SSL certificates using [Let’s Encrypt](https://letsencrypt.org/) or its own CA. These certificates terminate at Cloudflare’s edge — meaning HTTPS is secured from the end-user to Cloudflare, and then proxied to your Raspberry Pi.

## Step 1: Install `cloudflared` on Raspberry Pi

SSH into your Pi and install the `cloudflared` daemon:

```sh
sudo apt update
sudo apt install cloudflared
```

If it’s not available via `apt` (e.g. on Debian Bullseye), install it manually:

```sh
curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest \
| grep "browser_download_url.*linux-arm64.deb" \
| cut -d '"' -f 4 \
| wget -i -

sudo dpkg -i cloudflared-linux-arm64.deb
```

## Step 2: Authenticate cloudflared with Cloudflare

Run the login command:

```sh
cloudflared tunnel login
```

This will open a browser window to Cloudflare where you log in and select your domain. Once successful, credentials are saved to your home directory:

```sh
/home/<your-username>/.cloudflared/cert.pem
```

You’ll see output like:

```sh
2025-04-13T21:07:17Z INF You have successfully logged in.
```

Note for CI/CD authentication you should use different approach. See the [Automate Cloudflare Tunnel Setup using Ansible](#automate-cloudflare-tunnel-setup-using-ansible) section.

## Step 3: Create the Tunnel

Create a new named tunnel (replace `my-tunnel` with your preferred name):

```sh
cloudflared tunnel create my-tunnel
```

You'll get output like:

```sh
Tunnel credentials written to /home/banana/.cloudflared/<tunnel-id>.json
Created tunnel my-tunnel with id <tunnel-id>
```

Keep that `.json` file secret — it acts as the tunnel's credentials.

## Step 4: Create a DNS Record in Cloudflare

To point a domain/subdomain to the tunnel, run:

```sh
cloudflared tunnel route dns my-tunnel your-subdomain.yourdomain.com
```

This creates a CNAME in Cloudflare's DNS routing traffic to your tunnel.

## Step 5: Test the Tunnel

Run your tunnel and map it to a local port (replace `PORT` with your app's port):

```sh
cloudflared tunnel run --url http://localhost:3000 my-tunnel
```

Your app should now be available at:

```sh
https://your-subdomain.yourdomain.com
```

## Step 6: Create a Persistent Tunnel Config File

Create a Cloudflare Tunnel config file:

```sh
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Paste in:

```yml
tunnel: my-tunnel
credentials-file: /home/banana/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: your-subdomain.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Update:

- `hostname` with your actual subdomain and domain
- `service` with the local port your app runs on
- `credentials-file` path to match your user and tunnel ID

This config allows Cloudflare to route requests to the local app on your Pi.

## Step 7: Start the Tunnel

Start the tunnel using the config file:

```sh
cloudflared tunnel run my-tunnel
```

You should again see output confirming the tunnel is active and routing traffic.

# (Optional) Step 8: Run on Boot with systemd

To have the tunnel start automatically when the Raspberry Pi boots:

```sh
sudo cloudflared --config ~/.cloudflared/config.yml service install
```

Then enable and start the systemd service:

```sh
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

You can verify it’s running with:

```sh
sudo systemctl status cloudflared
```

## Adding CloudFlared to CI for secure SSH tunnel

It is a common requirement to expose your Raspberry Pi SSH access to the internet. CloudFlared is a free and secure way to do this. It is better that exposing the port directly to the internet, and managing the router settings yourself because it is more secure. Here we will describe how to migrate the above working example into cloudflare.

### Add SSH server to the tunnel

```yml
tunnel: rpi-tunnel
credentials-file: /home/banana/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: www.yourdomain.com
    service: http://localhost:3000

  - hostname: ssh.yourdomain.com # 👈 Add this line
    service: ssh://localhost:22 # 👈 And this one

  - service: http_status:404
```

### Create new DNS records on cloudflare:

1. Run this on your Pi:

```sh
cloudflared tunnel route dns rpi-tunnel ssh.yourdomain.com
```

2. Restart the tunnel service:

```sh
sudo systemctl restart cloudflared
```

### Test SSH tunnel access from the client

Test the SSH tunnel locally: On your laptop (where cloudflared is installed). Make a one-time change to your SSH configuration file:

```sh
vim ~/.ssh/config
```

Input the following values; replacing ssh.example.com with the hostname you created.

```sh
Host ssh.example.com
ProxyCommand /usr/local/bin/cloudflared access ssh --hostname %h
```

The cloudflared path may be different depending on your OS and package manager. For example, if you installed cloudflared on macOS with Homebrew, the path is /opt/homebrew/bin/cloudflared.

You can now test the connection by running a command to reach the service:

```sh
ssh <username>@ssh.example.com
```

### Add the SSH tunnel to your CI/CD pipeline:

1. Add the following to your CI/CD pipeline:

```yml
- name: Setup SSH key
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan -H ssh.yourdomain.com >> ~/.ssh/known_hosts
```

In your GitHub Actions setup:

```sh
CF_SSH_HOST = ssh.yourdomain.com
CF_SSH_USER = username
```

That’s the address GitHub Actions will use to access the Raspberry Pi securely over SSH through Cloudflare.

### Enable Cloudflare Access for SSH

Go to the Cloudflare Zero Trust dashboard:

- Go to Access > Applications
- Add new app:
  - Type: SSH
  - Hostname: ssh.yourdomain.com
  - Session Duration: your choice (e.g., 30m)

Add an Access Policy allowing access to the GitHub Actions runner email (or set it to “Public” for testing)

### GitHub Actions Setup

Add the following secrets to GitHub:

| Secret Name     | Description                                   |
| --------------- | --------------------------------------------- |
| SSH_PRIVATE_KEY | Private key that matches Pi's authorized_keys |
| CF_SSH_HOST     | e.g. ssh.yourdomain.com                       |
| CF_SSH_USER     | e.g. pi                                       |

You’ll generate the Access token manually for now — see below.

### Generate Access Token

To get a token that GitHub can use, run this locally:

```sh
cloudflared access token --hostname ssh.yourdomain.com
```

Copy the token and add it as `CF_ACCESS_TOKEN` in GitHub Secrets.

You can automate this later with Service Tokens or short-lived JWTs, but for now, start with this manual approach.

### Github Actions:

Here’s a working job that:

- Uses cloudflared and ssh to connect through the tunnel
- Deploys the docker-compose.yaml and runs the app

```yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup SSH Key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa

      - name: Install cloudflared
        run: |
          curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
          chmod +x cloudflared
          sudo mv cloudflared /usr/local/bin/cloudflared

      - name: Setup SSH Config for Cloudflare Tunnel
        run: |
          echo "Host ${{ secrets.CF_SSH_HOST }}" >> ~/.ssh/config
          echo "  ProxyCommand /usr/local/bin/cloudflared access ssh --hostname %h" >> ~/.ssh/config
          echo "  StrictHostKeyChecking no" >> ~/.ssh/config
          echo "  UserKnownHostsFile=/dev/null" >> ~/.ssh/config
          chmod 600 ~/.ssh/config

      - name: Deploy docker-compose to Raspberry Pi
        run: |
          scp ./docker-compose.yaml ${{ secrets.CF_SSH_USER }}@${{ secrets.CF_SSH_HOST }}:/home/${{ secrets.CF_SSH_USER }}/docker-compose.yaml

      - name: Log in to Docker on Remote Host
        run: |
          ssh ${{ secrets.CF_SSH_USER }}@${{ secrets.CF_SSH_HOST }} << 'ENDSSH'
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          ENDSSH

      - name: Pull Docker Images
        run: |
          ssh ${{ secrets.CF_SSH_USER }}@${{ secrets.CF_SSH_HOST }} << 'ENDSSH'
          docker-compose pull 
          ENDSSH

      - name: Restart Docker Images
        run: |
          ssh ${{ secrets.CF_SSH_USER }}@${{ secrets.CF_SSH_HOST }} << 'ENDSSH'
          docker stop $(docker ps -q)
          docker rm $(docker ps -aq)
          docker-compose up -d
          ENDSSH
```

## Automate Cloudflare Tunnel Setup using Ansible

You can use Ansible to install cloudflared on the Raspberry Pi.

### Create a tunnel in Cloudflare manually (once):

1. Go to your Cloudflare dashboard → Zero Trust → Networks → Tunnels
2. Create a new tunnel (e.g., `rpi-ssh`)
3. Follow the steps of tunnel creating, you will get to the point where you need to authenticate with token, and the token will be visible like follows:

```sh
brew install cloudflared && sudo cloudflared service install <token>
```

## Save token and config in your Ansible role:

First we need to store the token under `cloudflare_tunnel_token` in playbooks:

```yml
# playbook -> cloudflared_playbook.yml
- hosts: all
  become: yes

  vars:
    cloudflare_tunnel_token: 'your_cloudflare_token_here' # Replace with your actual token

  roles:
    - cloudflare_tunnel
```

Here is the full ansible code for installing and enabling the cloudflared tunnel that you just created.

```yml
# role -> cloudflared_tunnel.yml
- name: Install cloudflared binary
  command: >
    wget -O /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
  args:
    creates: /usr/local/bin/cloudflared

- name: Make cloudflared executable
  command: chmod +x /usr/local/bin/cloudflared

- name: Install Cloudflare Tunnel service using token
  command: cloudflared service install {{ cloudflare_tunnel_token }}
  args:
    creates: /etc/systemd/system/cloudflared.service

- name: Enable cloudflared service to start on boot
  command: systemctl enable cloudflared

- name: Start cloudflared service
  command: systemctl start cloudflared

- name: Verify cloudflared version
  command: cloudflared --version
  register: cloudflared_version

- name: Show cloudflared version
  debug:
    var: cloudflared_version.stdout
```

# Conclusion

Cloudflare Tunnel is one of the most elegant ways to expose your Raspberry Pi (or any internal service) to the internet. It's free, fast, and secure — and you get the added benefit of not having to deal with the hassle of network configuration.

Whether you’re deploying a hobby project, internal dashboard, or full web app — Cloudflare Tunnel is a must-have tool in your Raspberry Pi dev toolkit.

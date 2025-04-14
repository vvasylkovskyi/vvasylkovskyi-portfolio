# Expose Raspberry Pi with Cloudflare Tunnel

Using a Cloudflare Tunnel is by far the cleanest, most reliable, and secure way to expose a local service (like your Next.js app on a Raspberry Pi) to the internet — no port forwarding, no router headaches, no CGNAT worries

## A word on SSL certificate

The TLS Certificate Comes from Cloudflare. Cloudflare terminates the HTTPS connection at their edge.
Cloudflare automatically generates and manages TLS certificates for your domain (e.g., your-subdomain.yourdomain.com) using Let's Encrypt or their own certificate authority.

These certs are stored and served from Cloudflare's edge servers — super fast and global.

## Step 1: Install cloudflared on the Pi

SSH into your Raspberry Pi and run:

```bash
sudo apt update
sudo apt install cloudflared
```

Or, if it's not in your repo (e.g. Debian Bullseye):

```bash
curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest \
| grep "browser_download_url.*linux-arm64.deb" \
| cut -d '"' -f 4 \
| wget -i -

sudo dpkg -i cloudflared-linux-arm64.deb
```

## Step 2: Authenticate cloudflared with your Cloudflare account

Run:

```bash
cloudflared tunnel login
```

You will be prompted to log in to your Cloudflare account and authorize the tunnel. After authorization, you will receive a tunnel identifier (e.g., `tunnel-1234567890`).

This will open a browser where you log into Cloudflare and select your domain. Once authenticated, it’ll create a .cloudflared folder in your home dir with credentials. Like follows:

```bash
banana@raspberrypi:~ $ cloudflared tunnel login
A browser window should have opened at the following URL:

https://dash.cloudflare.com/argotunnel?aud=&callback=<url>

If the browser failed to open, please visit the URL above directly in your browser.
2025-04-13T21:07:02Z INF Waiting for login...
2025-04-13T21:07:17Z INF You have successfully logged in.
If you wish to copy your credentials to a server, they have been saved to:
/home/<yourself>/.cloudflared/cert.pem
```

## Step 3: Create the tunnel

```bash
cloudflared tunnel create my-tunnel
```

This will create a named tunnel and give you a tunnel ID. Example output

```bash
banana@raspberrypi:~ $ cloudflared tunnel create my-tunnel
Tunnel credentials written to /home/banana/.cloudflared/<long-hash>.json. cloudflared chose this file based on where your origin certificate was found. Keep this file secret. To revoke these credentials, delete the tunnel.

Created tunnel my-tunnel with id <long-hash>
banana@raspberrypi:~ $
```

## Step 4: Create a DNS record in Cloudflare

```bash
cloudflared tunnel route dns my-tunnel your-subdomain.yourdomain.com
```

## Step 5: Test tunnel

```bash
cloudflared tunnel run --url localhost:PORT TUNNELNAME
```

## Step 6: Create a config file

Create a new file in the following location on your device.

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

In this example, we want to expose a Nginx server running on port 443.

```yaml
tunnel: my-tunnel
credentials-file: /home/banana/.cloudflared/<long-hash>.json

ingress:
  - hostname: your-subdomain.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Replace `your-subdomain.yourdomain.com` with your desired subdomain and domain.

This will create a CNAME in Cloudflare pointing to the tunnel. Example output:

```bash
2025-04-13T21:16:18Z INF Added CNAME your-subdomain.yourdomain.com which will route to this tunnel tunnelID=<long-hash>
```

## Step 7: Start the tunnel

```bash
cloudflared tunnel run my-tunnel
```

## (Optional) Set up as a systemd service

To run the tunnel on boot:

```bash
sudo cloudflared service install
```

This will create a systemd service that starts the tunnel on boot.

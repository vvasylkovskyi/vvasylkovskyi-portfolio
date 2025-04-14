# Expose Your Raspberry Pi to the Internet with Cloudflare Tunnel

Exposing local applications (like your Next.js app running on a Raspberry Pi) to the internet can be messy. You usually have to deal with port forwarding, dynamic IP addresses, or carrier-grade NAT — none of which are ideal.

Luckily, **Cloudflare Tunnel** makes this painless. It's secure, fast, and removes the need for any router configuration. This guide walks you through setting it up step-by-step.

---

## Why Cloudflare Tunnel?

- **No port forwarding**
- **No static IP required**
- **Works behind NATs**
- **Free TLS/SSL certificates**
- **Super low latency via Cloudflare’s global network**

---

## SSL/TLS Certificates — Handled for You

Cloudflare automatically issues and manages SSL certificates using [Let’s Encrypt](https://letsencrypt.org/) or its own CA. These certificates terminate at Cloudflare’s edge — meaning HTTPS is secured from the end-user to Cloudflare, and then proxied to your Raspberry Pi.

---

## Step 1: Install `cloudflared` on Raspberry Pi

SSH into your Pi and install the `cloudflared` daemon:

```bash
sudo apt update
sudo apt install cloudflared
```

If it’s not available via `apt` (e.g. on Debian Bullseye), install it manually:

```bash
curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest \
| grep "browser_download_url.*linux-arm64.deb" \
| cut -d '"' -f 4 \
| wget -i -

sudo dpkg -i cloudflared-linux-arm64.deb
```

## Step 2: Authenticate cloudflared with Cloudflare

Run the login command:

```bash
cloudflared tunnel login
```

This will open a browser window to Cloudflare where you log in and select your domain. Once successful, credentials are saved to your home directory:

```bash
/home/<your-username>/.cloudflared/cert.pem
```

You’ll see output like:

```bash
2025-04-13T21:07:17Z INF You have successfully logged in.
```

## Step 3: Create the Tunnel

Create a new named tunnel (replace `my-tunnel` with your preferred name):

```bash
cloudflared tunnel create my-tunnel
```

You'll get output like:

```bash
Tunnel credentials written to /home/banana/.cloudflared/<tunnel-id>.json
Created tunnel my-tunnel with id <tunnel-id>
```

Keep that `.json` file secret — it acts as the tunnel's credentials.

## Step 4: Create a DNS Record in Cloudflare

To point a domain/subdomain to the tunnel, run:

```bash
cloudflared tunnel route dns my-tunnel your-subdomain.yourdomain.com
```

This creates a CNAME in Cloudflare's DNS routing traffic to your tunnel.

## Step 5: Test the Tunnel

Run your tunnel and map it to a local port (replace `PORT` with your app's port):

```bash
cloudflared tunnel run --url http://localhost:3000 my-tunnel
```

Your app should now be available at:

```bash
https://your-subdomain.yourdomain.com
```

## Step 6: Create a Persistent Tunnel Config File

Create a Cloudflare Tunnel config file:

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Paste in:

```yaml
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

```bash
cloudflared tunnel run my-tunnel
```

You should again see output confirming the tunnel is active and routing traffic.

# (Optional) Step 8: Run on Boot with systemd

To have the tunnel start automatically when the Raspberry Pi boots:

```bash
sudo cloudflared --config ~/.cloudflared/config.yml service install
```

Then enable and start the systemd service:

```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

You can verify it’s running with:

```bash
sudo systemctl status cloudflared
```

# Conclusion

Cloudflare Tunnel is one of the most elegant ways to expose your Raspberry Pi (or any internal service) to the internet. It's free, fast, and secure — and you get the added benefit of not having to deal with the hassle of network configuration.

Whether you’re deploying a hobby project, internal dashboard, or full web app — Cloudflare Tunnel is a must-have tool in your Raspberry Pi dev toolkit.

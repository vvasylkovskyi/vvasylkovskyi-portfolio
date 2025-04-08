# Setup Nginx For Linux

https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-20-04#step-5-%E2%80%93-setting-up-server-blocks-(recommended)

# Setup Nginx For Mac

- First, add domain in `/etc/hosts`

- Nginx config file is here: `/usr/local/etc/nginx/nginx.conf`

https://medium.com/@VenuThomas/what-is-nginx-and-how-to-set-it-up-on-mac-107a2482a33a

## Install

`$ brew install nginx`

## Start

`$ brew services start nginx`
`$ nginx`

Start with arbitrary file
`$ nginx -c /Users/vvl02/git/neo-raspberry/nginx/nginx.conf`

## Stop

`$ brew services stop nginx`
`$ nginx -s stop`

## Update Config

Check where the configuration file is first:

`nginx -t`

Update file

## Nginx with Docker

- https://chuan-zhang.medium.com/nginx-tutorial-1-start-a-static-web-server-using-nginx-docker-20c8fe71a832

### First, build docker image

- `$ docker build -t neo-raspberry-nginx-reverse-proxy .`

If we would like to build it directly onto VM, we need to specify host via SSH

- `$ docker -H ssh://<user>@<ip-address> build . -t neo-raspberry-nginx`

You may need to add an ssh key to the system before

- `$ ssh-add -k <key-location>`

### Last - run Nginx via docker container

1. Access VM - instructions in `virtual-machine`
2. Run docker container from the machine:
   - `$ docker run -p 443:443 --name neo-raspberry-nginx neo-raspberry-nginx:latest`

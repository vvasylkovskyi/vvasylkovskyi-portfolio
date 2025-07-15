# Setting up Open Web Analytics

## Installing Software

### Install Nginx

Install Nginx - https://www.linuxbabe.com/linux-server/how-to-install-lemp-stack-linux-nginx-mariadb-php-on-centos7

```sh
sudo apt install nginx
```

### Install PHP 7.4 and FPM

Install PHP 7.4. Make sure to be 7.4 - https://www.thedataops.org/how-to-downgrade-php-8-to-7-4-in-ubuntu/

Install PHP and PHP-FPM - https://www.linuxbabe.com/linux-server/how-to-install-lemp-stack-linux-nginx-mariadb-php-on-centos7

```sh
sudo apt-get install software-properties-common
sudo apt-get install php7.4
```

#### Downgrade to PHP 7.4

```sh
sudo apt-get purge php8.*
sudo add-apt-repository ppa:ondrej/php
sudo apt-get update
sudo apt-get install php7.4
php -v
```

#### Install PHP-FPM and PHP-mysql

```sh
sudo apt install php7.4-mysql php7.4-fpm php7.4-gd php7.4-xml php7.4-mbstring
```

#### Install Supervisor

```sh
sudoa apt install supervisor
```

### Configurations

#### Reference

Follow this docker for configuration - https://github.com/TrafeX/docker-php-nginx/blob/master/Dockerfile
Use this FPM configuration - https://www.digitalocean.com/community/tutorials/php-fpm-nginx

#### FMP Configuration

`/etc/php/7.4/fpm/pool.d/www.conf`

```conf
[www]
user = nobody
group = nobody
listen = /var/run/php/php7.4-fpm.sock
listen.owner = nobody
listen.group = nobody
php_admin_value[disable_functions] = exec,passthru,shell_exec,system
php_admin_flag[allow_url_fopen] = off
; Choose how the process manager will control the number of child processes.
pm = dynamic
pm.max_children = 75
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.process_idle_timeout = 10s
```

#### PHP Configuration

php.ini config: `/etc/php/7.4/fpm/php.ini`

```ini
[Date]
date.timezone="UTC"
expose_php= Off
```

#### Supervisor Configuration

On Supervisor - use this configuration

`/etc/supervisor/conf.d/supervisord.conf`

```conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0
pidfile=/run/supervisord.pid

[program:php-fpm]
command=php-fpm7.4 -F
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=false
startretries=0

[program:nginx]
command=nginx -g 'daemon off;'
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=false
startretries=0
```

#### Nginx Configuration

On Nginx use this configuration

`/etc/nginx/conf.d/default.conf`

```conf
# Default server definition
server {
    listen [::]:8080 default_server;
    listen 8080 default_server;
    server_name _;

    sendfile off;
    tcp_nodelay on;
    absolute_redirect off;

    root /var/www/html;
    index index.php index.html;

    location / {
        # First attempt to serve request as file, then
        # as directory, then fall back to index.php
        try_files $uri $uri/ /index.php?q=$uri&$args;
    }

    # Redirect server error pages to the static page /50x.html
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /var/lib/nginx/html;
    }

    # Pass the PHP scripts to PHP-FPM listening on php-fpm.sock
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_index index.php;
        include fastcgi_params;
    }

    # Set the cache-control headers on assets to cache for 5 days
    location ~* \.(jpg|jpeg|gif|png|css|js|ico|xml)$ {
        expires 5d;
    }

    # Deny access to . files, for security
    location ~ /\. {
        log_not_found off;
        deny all;
    }

    # Allow fpm ping and status from localhost
    location ~ ^/(fpm-status|fpm-ping)$ {
        access_log off;
        allow 127.0.0.1;
        deny all;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_pass unix:/run/php-fpm.sock;
    }
}
```

And here `/etc/nginx/nginx.conf`

```conf
worker_processes auto;
error_log stderr warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # Define custom log format to include reponse times
    log_format main_timed '$remote_addr - $remote_user [$time_local] "$request" '
                          '$status $body_bytes_sent "$http_referer" '
                          '"$http_user_agent" "$http_x_forwarded_for" '
                          '$request_time $upstream_response_time $pipe $upstream_cache_status';

    access_log /dev/stdout main_timed;
    error_log /dev/stderr notice;

    keepalive_timeout 65;

    # Write temporary files to /tmp so they can be created as a non-privileged user
    client_body_temp_path /tmp/client_temp;
    proxy_temp_path /tmp/proxy_temp_path;
    fastcgi_temp_path /tmp/fastcgi_temp;
    uwsgi_temp_path /tmp/uwsgi_temp;
    scgi_temp_path /tmp/scgi_temp;

    # Hardening
    proxy_hide_header X-Powered-By;
    fastcgi_hide_header X-Powered-By;
    server_tokens off;

    # Enable gzip compression by default
    gzip on;
    gzip_proxied any;
    gzip_types text/plain application/xml text/css text/js text/xml application/x-javascript text/javascript application/json appl>
    gzip_vary on;
    gzip_disable "msie6";

    # Include server configs
    include /etc/nginx/conf.d/*.conf;
}
```

## Permissions

Make sure to use the same user for both nginx and fpm. Should be `nobody`

### Add users like follows:

- `groupadd nobody`
- `useradd -g nobody nobody`

### Check users

- `grep nobody /etc/passwd`
- `grep nobody /etc/group`

### Add permissions to files

```sh
sudo chown -R nobody.nobody /var/run/php
sudo chown -R nobody.nobody /var/www/html
sudo chown -R nobody.nobody /var/lib/nginx/
sudo chown -R nobody.nobody /var/log/nginx/
```

Get permissions to the new folder (TODO Check if we need this)

`sudo chown nobody.nobody /var/www/html -R`

## Run PHP Project

Start with supervisor

`/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf`

Make sure that PHP open as expected at this stage.

If everything is OK, proceed to adding Open Web Analytics to the main folder

## Adding Open Web Analytics

### Reference

Get OWA instructions from here - https://www.linuxbabe.com/linux-server/open-web-analytics-centos-7-nginx-mariadb

### Getting the OWA and moving it into the main folder

```sh
wget https://github.com/padams/Open-Web-Analytics/archive/1.7.2.zip
sudo apt install unzip
unzip 1.7.2.zip
sudo mv Open-Web-Analytics-1.7.2/ /var/www/html
sudo chown nobody.nobody /var/www/html -R # Permissions
```

Check if the website works as expected at this stage by navigating you should see the setup page.

Navigate to `http://<IP>:8080/install.php`.

## Add a database

### Reference

https://www.rosehosting.com/blog/how-to-install-open-web-analytics-on-ubuntu-18-04/

### Adding MariaDB

```sh
sudo apt install mariadb-server mariadb-client
sudo systemctl stop mariadb.service
sudo systemctl start mariadb.service
sudo systemctl enable mariadb.service
```

#### Secure Instalation on DB

```sh
sudo mysql_secure_installation
```

Restart after

```sh
sudo systemctl restart mariadb.service
```

#### Create database and users

```sh
sudo mysql -u root -p

CREATE DATABASE owa_db;
CREATE USER 'owa_user'@'localhost' IDENTIFIED BY 'Str0n9Pas$worD';
GRANT ALL ON owa_db.* TO 'owa_user'@'localhost' IDENTIFIED BY 'Str0n9Pas$worD' WITH GRANT OPTION;

FLUSH PRIVILEGES;
EXIT;
```

#### Add HTTPS

Adding certificates from local machine

```sh
scp -i <key-location> <cert-key> <user>@<ip>:/etc/ssl/private/<cert-key>
scp -i <key-location> <cert> <user>@<ip>:/etc/ssl/certs/<cert>
```

Change Nginx Config to use HTTPS

open `/etc/nginx/conf.d/default.conf` and add this in the beginning of the file

```conf
    server {
        listen 443 ssl;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;

        server_name viktorvasylkovskyi.com *.viktorvasylkovskyi.com;

        ssl_certificate /etc/ssl/certs/viktorvasylkovskyi_com.pem;
        ssl_certificate_key /etc/ssl/private/viktorvasylkovskyi_com.key;
        ...
```

## Install OWA Dependencies with Composer

Install composer on the system, and install dependencies into the OWA project.

First get the composer

### Download Composer

```sh
curl -sS https://getcomposer.org/installer -o composer-setup.php
```

### Install Composer with PHP

```sh
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
```

### Install OWA Dependencies

Finally, using PHP, you can install OWA dependencies by running this in the OWA root folder

```sh
composer install
```

If everything goes well, you should see the following in the terminal

```sh
Package operations: 2 installs, 0 updates, 0 removals
  - Downloading composer/ca-bundle (1.2.6)
  - Downloading ua-parser/uap-php (v3.9.7)
  - Installing composer/ca-bundle (1.2.6): Extracting archive
  - Installing ua-parser/uap-php (v3.9.7): Extracting archive
Generating autoload files
```

## Finish setup in OWA Wizard

Finally run the supervisor in detached mode - `/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf > /dev/null &`

You can exit your ssh session now.

## Troubleshoot

10. Need to give write permissions to nobody too: sudo chown -R nobody.nobody /var/www/html

TODO - try downgrading to php7 - https://www.thedataops.org/how-to-downgrade-php-8-to-7-4-in-ubuntu/

Check the pending FPM sessions - `ps aux | grep php-fpm`

Kill them - `sudo service php7.4-fpm stop`

Or kill them one by one with `kill -9 <pid>`

## Issues with PHP 8 and OWA 1.7.2

Getting this error now - Fatal error: Uncaught Error: Class "Monolog\Logger" not found

Install dependencies

- composer require monolog/monolog
- composer require php-console/php-console

Gettign this error now - Fatal error: Uncaught Error: Undefined constant "OWA_DTD_BIGINT"

Seems like php8 is not supported. See here - https://stackoverflow.com/questions/77307436/open-web-analytics-error-during-first-call-to-install-php-because-of-missing-owa

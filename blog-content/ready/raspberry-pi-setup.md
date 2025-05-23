# From Zero to SSH: Setting Up Raspberry Pi with OS Lite and Ansible Automation

Once your Raspberry Pi hardware order is complete, the next major step is configuring the SD card with the necessary software to bring your Pi to life. In this guide, you'll learn how to flash Raspberry Pi OS Lite to an SD card and configure a minimal backend setup using `Ansible` — a powerful tool for automating software provisioning and configuration.

Having configured many Raspberry Pi devices in the past, I can confidently say that doing it manually is time-consuming and repetitive. Ansible changes that by letting you define your setup in code and reapply it with ease. Let's dive in!

## Step 1: Installing Raspberry Pi OS Lite on an SD Card

Begin by downloading the OS image:

* Raspberry Pi OS Lite (64-bit): [Download here](https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2025-05-13/2025-05-13-raspios-bookworm-arm64-lite.img.xz)

Make sure the OS version matches your hardware’s architecture (e.g., ARM64).

### Flash the OS Image

1. Download and install [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. Open Raspberry Pi Imager.
3. Choose the OS (Raspberry Pi OS Lite), select the SD card, and click the settings icon (⚙️) or press `CMD + Shift + X` to open advanced options.
4. Proceed to OS customization (see next section).

## Step 2: Customize the OS for Headless Access

Since OS Lite has no graphical interface, we need to enable SSH and configure credentials ahead of time.

### Enable SSH with Public Key Authentication

1. In the advanced settings menu:

   * ✅ Enable SSH
   * 🔘 Select "Only allow public-key authentication"

2. Generate an SSH key pair on your Mac:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter to accept the default file path (`~/.ssh/<your-key-name>`) and choose a passphrase if desired.

3. Copy the contents of your public key:

```bash
cat ~/.ssh/<your-key-name>.pub
```

Paste this into the SSH public key field in the Raspberry Pi Imager settings.

### Define Username and Network

* Set a username (e.g., `pi`) and optionally leave the password blank.
* (Optional) Configure wireless LAN settings (SSID, password, and country).
* Set a hostname for easy network discovery (e.g., `raspberrypi`).

Click **Save**, then **Write** to flash the SD card.

## Step 3: Boot the Raspberry Pi

Insert the SD card into your Raspberry Pi and power it on. The device should boot and connect to the network.

Since it's headless, you won't see anything visually—your next interaction will be via SSH.

## Step 4: Connect to the Pi via SSH

To test the setup:

1. Ensure your Mac is on the same network as the Raspberry Pi.
2. Add your private key to the SSH agent:

```bash
ssh-add ~/.ssh/<your-private-key>
```

3. Connect via hostname or IP:

```bash
ssh pi@raspberrypi.local
```

If you configured everything correctly, you'll be logged in without needing a password.

## Step 5: Automate Software Setup with Ansible

At this stage, your Raspberry Pi is running a bare OS. Let’s install useful backend software using Ansible.

### Prepare Ansible on Your Mac

1. Install Ansible:

```bash
brew install ansible
```

2. Create an inventory file (e.g., `inventory.yml`):

```yml
# inventory.yml
all:
  hosts:
    raspberrypi:
      ansible_host: raspberrypi.local
      ansible_user: vvasylkovskyi
      ansible_ssh_private_key_file: ~/.ssh/<your-key-file>
```

3. Write a playbook (e.g., `playbook.yml`) to install packages:

```yml
# playbook.yml
- name: Setup Raspberry Pi 
  hosts: all
  become: true

  roles:
    - setup
```

4. Write a role: (e.g. `setup.yml`)

```yml
# setup.yml 

- name: Update package list
  command: apt update

- name: Upgrade all packages
  command: apt upgrade -y

- name: Install Python 3 and pip
  apt:
    name:
      - python3
      - python3-pip
    state: latest
    update_cache: yes
```

4. Run the playbook:

```bash
ansible-playbook -i inventory.ini setup.yml
```

Verify on the Rpi that python was installed by running: 

```bash
python -v
```

## Adding Datadog Agent to Rpi 

Install the Datadog Ansible Collection from Ansible Galaxy on your Ansible Server: 

```bash
ansible-galaxy collection install datadog.dd
```

Add datadog rule: 

```yml
- hosts: servers
  tasks:
    - name: Import the Datadog Agent role from the Datadog collection
      import_role:
        name: datadog.dd.agent
  vars:
    datadog_api_key: "{{ datadog_api_key }}"
    datadog_site: "datadoghq.eu"
```

### Check the Datadog process is working

```bash
sudo datadog-agent status
sudo systemctl status datadog-agent
sudo tail -n 100 /var/log/datadog/agent.log
```

### Confirm on the Datadog UI
Go to your [Datadog infrastructure dashboard](https://app.datadoghq.eu/infrastructure) (or the appropriate site for your region) and check:

  - Your Raspberry Pi shows up as a host.
  - Metrics are being collected.
  - The host has the correct hostname (matching your RPi).



## ✅ Summary

You’ve successfully:

* Flashed Raspberry Pi OS Lite
* Enabled headless SSH access with secure keys
* Booted the Pi without needing a display
* Connected via SSH
* Automated backend setup using Ansible

This setup lays the foundation for repeatable, scalable Raspberry Pi deployments. Happy hacking! 🛠️

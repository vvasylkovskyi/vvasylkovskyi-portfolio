# How to Set Up a Secure SSH Connection to Your Raspberry Pi (with CI Integration)

Secure Shell (SSH) is the backbone of remote administration, especially when working with devices like the Raspberry Pi. Whether you're deploying code, managing configurations, or automating tasks through CI/CD pipelines, SSH provides a safe and efficient way to connect.

In this guide, we’ll walk through setting up SSH key-based authentication, the recommended and more secure alternative to password-based login. We'll also demonstrate how to integrate this setup into a CI pipeline such as GitHub Actions.

## Why Use SSH Key Authentication?

SSH key authentication offers a more secure and automated alternative to traditional password-based login. It allows you to:

- Avoid hardcoding passwords
- Use your Raspberry Pi in CI/CD pipelines
- Automate deployments with no manual intervention

## Step 1: Generate an SSH Key Pair

On your local development machine (or CI environment), create a new RSA SSH key pair:

```bash
ssh-keygen -t rsa -b 4096 -f id_rsa_ci -N ""
```

- `-t rsa` specifies the key type.
- `-b 4096` ensures a strong key length.
- `-f id_rsa_ci` sets the output file name.
- `-N ""` creates the key with no passphrase, which is important for non-interactive environments like CI/CD.

This will create two files:

- `id_rsa_ci` (your private key)
- `id_rsa_ci.pub` (your public key)

Important: Never share your private key.

## Step 2: Copy the Public Key to Your Raspberry Pi

Use `ssh-copy-id` to authorize your local or CI environment to connect to the Raspberry Pi:

```bash
ssh-copy-id -i id_rsa_ci.pub <username>@<ip-address>
```

This command will append your public key to the Pi's `~/.ssh/authorized_keys` file, enabling key-based access.

Replace:

- `<username>` with your Pi’s username (e.g., pi)
- `<ip-address>` with the Raspberry Pi’s IP address

## Step 3: Store the Private Key in Your CI

If you’re using a CI provider like GitHub Actions, GitLab CI, or CircleCI:

1. Open your CI dashboard.
2. Navigate to your project’s secrets/settings.
3. Add a new secret (e.g., `SSH_PRIVATE_KEY`) and paste the contents of `id_rsa_ci`.

This allows your CI jobs to authenticate with your Raspberry Pi securely and programmatically.

## Step 4: Use the Private Key in CI (Example: GitHub Actions)

Here’s how to configure your GitHub Actions workflow to use the SSH key:

```yml
- name: Setup SSH key
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan -H <ip-address> >> ~/.ssh/known_hosts

- name: Copy file to Raspberry Pi
  run: |
    scp <file> <username>@<ip-address>:<folder-path>
```

Replace:

- `<file>` with the file you want to copy
- `<username>` with your Pi’s username (e.g., pi)
- `<ip-address>` with the Raspberry Pi’s IP address
- `<folder-path>` with the destination folder on the Pi

This script:

1. Creates the `.ssh` directory.
2. Writes the secret key to `~/.ssh/id_rsa`.
3. Sets appropriate permissions.
4. Adds the Pi to `known_hosts` to avoid host verification prompts.
5. Uses `scp` to securely copy a file to your Raspberry Pi.

## Final Thoughts

By using SSH key authentication and integrating it into your CI/CD workflow, you enable secure, automated deployments to your Raspberry Pi. This is especially useful in projects like home automation, IoT, or edge computing where your Pi acts as a remote node.

If you're just getting started, take the time to understand the underlying SSH concepts—this small investment in learning will pay off in both security and efficiency as your projects scale.

Got stuck or want to expand this setup? Feel free to reach out—I’d be happy to help.

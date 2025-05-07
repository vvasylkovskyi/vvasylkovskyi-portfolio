# Setting Up a Raspberry Pi 4B as a GitHub Actions Self-Hosted Runner

GitHub Actions has quickly become the go-to solution for continuous integration and delivery (CI/CD) workflows. While GitHub provides hosted runners for various operating systems and architectures, there are many use cases where a **self-hosted runner** is more appropriate—such as running workflows on specific hardware like a Raspberry Pi 4B.

Using a Raspberry Pi as a self-hosted runner is particularly useful if you are:

- Building and testing ARM64 Docker images.
- Running workflows that interact with IoT or edge devices.
- Seeking to offload builds from your main development machine.

In this guide, we'll walk through the process of setting up a **Raspberry Pi 4B as a GitHub Actions runner** and configuring it to run in the background on boot.

---

## 1. Create a Self-Hosted Runner on GitHub

To get started, navigate to your GitHub repository:

- Go to **Settings** → **Actions** → **Runners**.
- Click **"New self-hosted runner"**.
- Choose:
  - **Operating System**: Linux
  - **Architecture**: ARM64

GitHub will generate a script tailored for your configuration. It will look similar to this:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-arm64-2.315.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.315.0/actions-runner-linux-arm64-2.315.0.tar.gz
tar xzf ./actions-runner-linux-arm64-2.315.0.tar.gz
./config.sh --url https://github.com/<your-username>/<repo> --token <runner-token>
```

Make sure to replace `<your-username>`, `<repo>`, and `<runner-token>` with the values provided in your GitHub UI.

## 2. Prepare Your Raspberry Pi

Ensure your Raspberry Pi is up to date and has the necessary tools installed:

```bash
sudo apt update
sudo apt install -y git docker.io
```

Then, execute the script GitHub provided to download, extract, and configure the runner in the actions-runner directory.

## 3. Start the Runner

You can start the runner in the foreground by running:

```bash
./run.sh
```

However, to ensure the runner starts automatically in the background on boot, use the service installer that comes bundled:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

This command registers the runner as a systemd service. It will:

- Start on boot.
- Run in the background.
- Restart automatically if the system restarts.

## 4. Add the Runner to Your GitHub Actions Workflow

Now that your runner is online, you can target it in your GitHub Actions workflow YAML.

Here’s a simple example:

Add the following to your GitHub Actions workflow:

```yml
jobs:
  build:
    runs-on: [self-hosted, rpi, arm64, docker]
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Build Docker Image
        run: |
          docker build -t my-image .
```

💡 You can use custom labels like rpi, arm64, or docker when registering the runner. These help filter which runners to use for specific jobs.

## 5. Monitor the Runner

If you ever need to troubleshoot or monitor the runner’s activity, check the log file:

```bash
cat /var/log/actions-runner/actions-runner.log
```

This log will contain information about job execution, errors, and connectivity with GitHub.

## Conclusion

Setting up a self-hosted GitHub Actions runner on a Raspberry Pi 4B is a powerful and cost-effective way to extend your CI/CD infrastructure. Whether you're building ARM64 Docker images or deploying edge applications, your Pi can handle it with surprising efficiency. By registering it as a systemd service, you also ensure it's always ready—whether after a reboot or a network hiccup.

This setup opens the door to a more customized and hardware-aware DevOps pipeline. Happy hacking! 🚀

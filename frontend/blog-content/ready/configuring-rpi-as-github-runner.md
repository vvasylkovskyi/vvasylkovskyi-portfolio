# RaspberryPi 4B as Github Actions runner

1. Create a Self-hosted Runner on GitHub

- Go to your GitHub repository → Settings → Actions → Runners.
- Click "New self-hosted runner".

Choose:

- OS: Linux
- Architecture: ARM64

GitHub will give you a script like this:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-arm64-2.315.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.315.0/actions-runner-linux-arm64-2.315.0.tar.gz
tar xzf ./actions-runner-linux-arm64-2.315.0.tar.gz
./config.sh --url https://github.com/<your-username>/<repo> --token <runner-token>

```

2.  Run the Commands on Your Raspberry Pi

Make sure Docker and Git are installed. You can run:

```bash
sudo apt update
sudo apt install -y git docker.io
```

Then execute the commands from GitHub to download and configure the runner.

3. Start the Runner

```bash
./run.sh
```

Or to run it in the background:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

The GitHub Actions runner's built-in script ./svc.sh install, it already sets up a systemd service that:

- Automatically starts the runner at boot.
- Runs it in the background.

4. Add the Runner to Your CI/CD Pipeline

Add the following to your GitHub Actions workflow:

```yaml
jobs:
  build:
    runs-on: self-hosted
    strategy:
      self-hosted-runners:
        runners:
          - name: rpi-runner
            labels:
              - rpi
              - arm64
              - docker
```

5. Monitor the Runner

You can check the status of the runner with:

```bash
cat /var/log/actions-runner/actions-runner.log
```

## Conclusion

You now have a self-hosted runner running on your Raspberry Pi that can be used to run GitHub Actions workflows.

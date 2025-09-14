# GitHub Actions Host Runner Setup

This setup allows you to run GitHub Actions runners directly on your Ubuntu host machine, supporting all workflows including Docker builds.

## Prerequisites

- Ubuntu host machine
- GitHub Personal Access Token with `repo` scope
- `jq` installed (`sudo apt-get install jq`)

## Quick Start

### 1. Set your GitHub PAT

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxxxx"
```

### 2. Setup a runner for a repository

```bash
cd /home/sjiang/devlocal/jnet-site/setup/host-runner
./scripts/setup-runner.sh <github-owner> <github-repo> [runner-name]

# Example
./scripts/setup-runner.sh stevenjiangnz jnet-site
```

### 3. Start the runner

```bash
./scripts/start-runner.sh <github-repo>

# Example
./scripts/start-runner.sh jnet-site
```

## Commands

### Setup Runner
```bash
./scripts/setup-runner.sh <github-owner> <github-repo> [runner-name]
```
- Downloads and configures GitHub Actions runner
- Creates systemd service configuration
- Registers runner with GitHub

### Start Runner
```bash
./scripts/start-runner.sh <github-repo>
```
- Starts runner in background
- Creates PID file for tracking
- Logs output to `logs/<repo>.log`

### Stop Runner
```bash
./scripts/stop-runner.sh <github-repo>
```
- Gracefully stops the runner
- Cleans up PID file

### Check Status
```bash
# Check all runners
./scripts/status-runner.sh

# Check specific runner
./scripts/status-runner.sh <github-repo>
```
- Shows running/stopped status
- Displays PID and uptime

### Remove Runner
```bash
./scripts/remove-runner.sh <github-owner> <github-repo>
```
- Stops and unregisters runner
- Removes all runner files
- Removes systemd service if installed

## Multiple Repositories

You can run multiple runners for different repositories:

```bash
# Setup runners for multiple repos
./scripts/setup-runner.sh myorg frontend
./scripts/setup-runner.sh myorg backend
./scripts/setup-runner.sh myorg data-pipeline

# Start all
./scripts/start-runner.sh frontend
./scripts/start-runner.sh backend
./scripts/start-runner.sh data-pipeline

# Check status of all
./scripts/status-runner.sh
```

## Running as systemd Service

For production use, run as a systemd service:

```bash
# After setup, copy service file
sudo cp config/github-runner-<repo>.service /etc/systemd/system/

# Enable and start service
sudo systemctl enable github-runner-<repo>
sudo systemctl start github-runner-<repo>

# Check service status
sudo systemctl status github-runner-<repo>
```

## Directory Structure

```
host-runner/
├── scripts/          # Management scripts
├── config/           # Service configurations
├── logs/             # Runner logs
└── runners/          # Runner installations
    └── <repo-name>/  # Each repo gets its own directory
```

## Logs

- Runner logs: `logs/<repo>.log`
- View logs: `tail -f logs/<repo>.log`
- Systemd logs: `sudo journalctl -u github-runner-<repo> -f`

## Troubleshooting

### Runner not starting
- Check logs: `tail -f logs/<repo>.log`
- Verify PAT has `repo` scope
- Ensure runner isn't already running: `./scripts/status-runner.sh`

### Registration failures
- Verify repository name is correct
- Check PAT permissions
- Ensure PAT isn't expired

### Docker permission errors
- Add user to docker group: `sudo usermod -aG docker $USER`
- Logout and login again

## Security

- PAT is only used during setup/removal
- Runners use temporary tokens during operation
- Each runner runs as your user (not root)
- Consider using dedicated user for production

## GitHub Workflow Usage

Use your host runners in workflows:

```yaml
jobs:
  build:
    runs-on: [self-hosted, linux, x64, host]
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t myapp .
      - run: docker push myapp
```
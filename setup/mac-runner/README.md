# GitHub Actions Mac Runner Setup

This setup allows you to run GitHub Actions runners on your Mac mini (or any macOS machine), supporting all workflows including Docker builds if Docker Desktop is installed.

## Prerequisites

- macOS (Intel or Apple Silicon)
- GitHub Personal Access Token with `repo` scope
- Homebrew (recommended) - Install from https://brew.sh
- `jq` - Will be installed automatically if Homebrew is available

## Architecture Support

This setup automatically detects your Mac's architecture:
- **Intel Macs**: Uses x64 runner
- **Apple Silicon (M1/M2/M3)**: Uses arm64 runner

## Quick Start

### 1. Initial Setup

```bash
cd /path/to/jnet-site/setup/mac-runner
chmod +x setup.sh
./setup.sh
```

### 2. Set your GitHub PAT

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxxxx"
```

### 3. Setup a runner for a repository

```bash
./scripts/setup-runner.sh <github-owner> <github-repo> [runner-name]

# Example
./scripts/setup-runner.sh stevenjiangnz jnet-site
```

### 4. Start the runner

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
- Auto-detects Mac architecture (Intel/Apple Silicon)
- Creates launchd plist configuration
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
- Kills any orphaned worker processes

### Check Status
```bash
# Check all runners
./scripts/status-runner.sh

# Check specific runner
./scripts/status-runner.sh <github-repo>
```
- Shows running/stopped status
- Displays PID, uptime, CPU, and memory usage
- Shows active job count

### Remove Runner
```bash
./scripts/remove-runner.sh <github-owner> <github-repo>
```
- Stops and unregisters runner
- Removes all runner files
- Removes launchd service if installed

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

## Running as launchd Service (Auto-start)

For production use, run as a launchd service to auto-start on login:

```bash
# After setup, copy plist file
cp config/com.github.actions.runner.<repo>.plist ~/Library/LaunchAgents/

# Load the service
launchctl load ~/Library/LaunchAgents/com.github.actions.runner.<repo>.plist

# Check service status
launchctl list | grep github.actions.runner

# Unload service
launchctl unload ~/Library/LaunchAgents/com.github.actions.runner.<repo>.plist
```

## Directory Structure

```
mac-runner/
├── scripts/          # Management scripts
├── config/           # Launchd plist configurations
├── logs/             # Runner logs
└── runners/          # Runner installations
    └── <repo-name>/  # Each repo gets its own directory
```

## Logs

- Runner logs: `logs/<repo>.log`
- View logs: `tail -f logs/<repo>.log`
- Launchd logs (if using service):
  - Standard output: `logs/<repo>.out.log`
  - Standard error: `logs/<repo>.err.log`

## Docker Support

If you need Docker support on your Mac runner:

1. Install Docker Desktop from https://docker.com
2. Ensure Docker Desktop is running
3. Add user to docker group (if applicable)

## Troubleshooting

### Runner not starting
- Check logs: `tail -f logs/<repo>.log`
- Verify PAT has `repo` scope
- Ensure runner isn't already running: `./scripts/status-runner.sh`
- Check if port is blocked by firewall

### Registration failures
- Verify repository name is correct
- Check PAT permissions
- Ensure PAT isn't expired
- For private repos, ensure PAT has access

### "Runner already exists" error
- Use the remove script first: `./scripts/remove-runner.sh owner repo`
- Or use `--replace` flag in config (already included in setup)

### Permission denied errors
- Ensure scripts are executable: `chmod +x scripts/*.sh`
- Check file ownership and permissions

### Apple Silicon specific issues
- Ensure you have Rosetta 2 installed: `softwareupdate --install-rosetta`
- Some actions may require x64 emulation

## Security

- PAT is only used during setup/removal
- Runners use temporary tokens during operation
- Each runner runs as your user (not root)
- Store PAT securely (consider using macOS Keychain)
- For production, consider using a dedicated user account

## GitHub Workflow Usage

Use your Mac runners in workflows:

```yaml
jobs:
  build:
    runs-on: [self-hosted, macOS, mac]
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: |
          # Your build commands here
          make build

  # For Apple Silicon specific builds
  build-arm64:
    runs-on: [self-hosted, macOS, arm64, mac]
    steps:
      - uses: actions/checkout@v3
      - name: Build for ARM64
        run: |
          # ARM64 specific build
          arch -arm64 make build
```

## Resource Considerations

- Each runner uses ~100-200MB RAM idle
- Active jobs may use 1-4GB RAM depending on workload
- Consider Mac's thermal management for sustained workloads
- Monitor disk space for build artifacts

## Tips

1. **Use specific labels**: Add custom labels during setup for better job routing
2. **Monitor resources**: Use Activity Monitor to watch CPU/RAM usage
3. **Clean workspace**: Runners clean workspace by default, but monitor disk usage
4. **Network stability**: Ensure stable internet connection for long-running jobs
5. **Power settings**: Disable sleep/hibernation for production runners
6. **Updates**: Keep GitHub runner updated (check releases page)
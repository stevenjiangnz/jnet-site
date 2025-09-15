#!/bin/bash
# Commit the GitHub Actions runner setup

cd /home/sjiang/devlocal/jnet-site

# Add the updated files
git add CLAUDE.md
git add .gitignore
git add plan/github-actions-k8s-runner-setup.md
git add setup/host-runner/README.md
git add setup/host-runner/setup.sh
git add setup/host-runner/.gitignore
git add setup/host-runner/scripts/setup-runner.sh
git add setup/host-runner/scripts/start-runner.sh
git add setup/host-runner/scripts/stop-runner.sh
git add setup/host-runner/scripts/status-runner.sh
git add setup/host-runner/scripts/remove-runner.sh

# Create commit
git commit -m "feat: add host-based GitHub Actions runner setup

- Remove K3d/Kubernetes runner setup (incompatible with Docker workflows)
- Add host-based runner scripts for full Docker support
- Support multiple runners (one per repository)
- Add start/stop/status/remove management scripts
- Add systemd service configuration support
- Update documentation and .gitignore

This setup allows running GitHub Actions directly on Ubuntu host with
full Docker support, avoiding K3d containerization limitations."

# Push to remote
git push origin develop

echo "Changes committed and pushed!"
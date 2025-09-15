#!/bin/bash
set -e

echo "Starting commit and push process..."

# Navigate to the repository directory
cd /home/sjiang/devlocal/jnet-site

# Remove temporary script if it exists
if [ -f "commit-runner-setup.sh" ]; then
    echo "Removing temporary script..."
    rm -f commit-runner-setup.sh
fi

# Check git status
echo "Current git status:"
git status

# Add the files
echo "Adding files to git..."
git add CLAUDE.md
git add .gitignore
git add plan/github-actions-k8s-runner-setup.md
git add setup/host-runner/

# Check what's staged
echo "Staged changes:"
git diff --staged --name-only

# Commit with the specified message
echo "Creating commit..."
git commit -m "feat: add host-based GitHub Actions runner setup

- Remove K3d/Kubernetes runner setup (incompatible with Docker workflows)
- Add host-based runner scripts for full Docker support  
- Support multiple runners (one per repository)
- Add start/stop/status/remove management scripts
- Add systemd service configuration support
- Update documentation and .gitignore

This setup allows running GitHub Actions directly on Ubuntu host with
full Docker support, avoiding K3d containerization limitations.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to develop branch
echo "Pushing to origin develop..."
git push origin develop

echo "Commit and push completed successfully!"
# GitHub Actions Self-Hosted Runner on Kubernetes Implementation Plan

## Overview
This plan outlines the steps to deploy self-hosted GitHub Actions runners on Kubernetes (K3s/K3d) with dynamic token generation to avoid GitHub Actions usage limits. This setup supports multiple runners for different repositories, each in their own namespace.

## Prerequisites
- Kubernetes cluster (K3s/K3d) installed and configured
- kubectl configured to access your cluster
- Docker installed
- GitHub repositories where you want to use the runners
- GitHub Personal Access Token with appropriate permissions

## Step 1: Create GitHub Personal Access Token (PAT)

### 1.1 Generate PAT
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name: `github-actions-runner-token`
4. Set expiration (recommend 90 days, set reminder to rotate)
5. Select scopes:
   - For **public repositories**: `public_repo`
   - For **private repositories**: `repo` (full control)
   - Optional: `workflow` (if you need to update workflows)
6. Click "Generate token"
7. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### 1.2 Store PAT Securely
Save the token temporarily in a secure location. We'll add it to Kubernetes secrets in Step 3.

## Step 2: Prepare Runner Environment

### 2.1 Create Namespaces
For multiple repositories, create separate namespaces:
```bash
# Create namespace for each repository you want runners for
kubectl create namespace runners-<your-repo-name-1>
kubectl create namespace runners-<your-repo-name-2>
kubectl create namespace runners-<your-repo-name-3>

# Example:
kubectl create namespace runners-myapp
kubectl create namespace runners-backend
kubectl create namespace runners-analytics
```

### 2.2 Create Directory Structure
```bash
mkdir -p ~/github-runners/{manifests,scripts}
cd ~/github-runners

# Create subdirectories for each repo's manifests
mkdir -p manifests/{repo1,repo2,repo3}  # Replace with your actual repo names
```

## Step 3: Create Kubernetes Secrets

### 3.1 Create Secrets for Each Repository
Create separate secrets in each namespace:

```bash
# Set your PAT (same for all repos if using same GitHub account)
export GITHUB_PAT="your-pat-token-here"
export GITHUB_OWNER="your-github-username-or-org"

# For each repository, create a secret in its namespace
# Pattern: kubectl create secret generic github-credentials \
#   --namespace=runners-<repo-name> \
#   --from-literal=GITHUB_PAT="${GITHUB_PAT}" \
#   --from-literal=GITHUB_OWNER="${GITHUB_OWNER}" \
#   --from-literal=GITHUB_REPO="<actual-repo-name>"

# Example for repository "my-web-app":
kubectl create secret generic github-credentials \
  --namespace=runners-my-web-app \
  --from-literal=GITHUB_PAT="${GITHUB_PAT}" \
  --from-literal=GITHUB_OWNER="${GITHUB_OWNER}" \
  --from-literal=GITHUB_REPO="my-web-app"

# Repeat for each repository you need runners for
```

### 3.2 Helper Script for Multiple Repos
```bash
cat > scripts/create-runner-for-repo.sh << 'EOF'
#!/bin/bash
# Usage: ./create-runner-for-repo.sh <repo-name> <github-owner> <github-pat> [namespace-suffix]

REPO_NAME=$1
GITHUB_OWNER=$2
GITHUB_PAT=$3
NAMESPACE_SUFFIX=${4:-$REPO_NAME}  # Use repo name as namespace suffix by default

NAMESPACE="runners-${NAMESPACE_SUFFIX}"

echo "Setting up runner for repository: ${REPO_NAME}"
echo "Namespace: ${NAMESPACE}"

# Create namespace
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Create secret
kubectl create secret generic github-credentials \
  --namespace="${NAMESPACE}" \
  --from-literal=GITHUB_PAT="${GITHUB_PAT}" \
  --from-literal=GITHUB_OWNER="${GITHUB_OWNER}" \
  --from-literal=GITHUB_REPO="${REPO_NAME}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret created in namespace ${NAMESPACE}"
EOF

chmod +x scripts/create-runner-for-repo.sh

# Usage examples:
# ./scripts/create-runner-for-repo.sh "my-web-app" "myusername" "ghp_xxxx"
# ./scripts/create-runner-for-repo.sh "backend-api" "myorg" "ghp_xxxx" "backend"
```

## Step 4: Create ConfigMap with Runner Scripts

### 4.1 Create ConfigMap Template
Since we're using multiple namespaces, we'll create a template that can be used for each repo:

```bash
cat > manifests/runner-scripts-configmap-template.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: runner-scripts
  namespace: NAMESPACE_PLACEHOLDER
data:
  entrypoint.sh: |
    #!/bin/bash
    set -e
    
    echo "Starting GitHub Actions Runner setup..."
    
    # Function to get registration token using PAT
    get_registration_token() {
      echo "Fetching registration token..."
      TOKEN=$(curl -s -X POST \
        -H "Authorization: token ${GITHUB_PAT}" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/registration-token \
        | jq -r .token)
      
      if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo "Failed to get registration token. Check your PAT permissions."
        exit 1
      fi
      
      echo "${TOKEN}"
    }
    
    # Get fresh registration token
    REG_TOKEN=$(get_registration_token)
    echo "Successfully obtained registration token"
    
    # Configure runner
    echo "Configuring runner..."
    ./config.sh \
      --url "https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}" \
      --token "${REG_TOKEN}" \
      --name "k3d-runner-$(hostname)" \
      --labels "k3d,self-hosted,linux,x64,docker" \
      --unattended \
      --replace
    
    # Start runner
    echo "Starting runner..."
    ./run.sh
EOF

```

### 4.2 Apply ConfigMap for Each Repository
```bash
# For each repository, apply the ConfigMap to its namespace
for NAMESPACE in runners-repo1 runners-repo2 runners-repo3; do
  sed "s/NAMESPACE_PLACEHOLDER/${NAMESPACE}/g" manifests/runner-scripts-configmap-template.yaml | kubectl apply -f -
done
```

## Step 5: Create Runner Dockerfile

### 5.1 Create Dockerfile
```bash
cat > Dockerfile << 'EOF'
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    sudo \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Create runner user
RUN useradd -m runner && \
    usermod -aG docker runner && \
    echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Download and extract GitHub Actions runner
WORKDIR /home/runner
RUN RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/v//') && \
    curl -L -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz && \
    tar xzf actions-runner.tar.gz && \
    rm actions-runner.tar.gz && \
    chown -R runner:runner /home/runner

# Switch to runner user
USER runner

# Set entrypoint
ENTRYPOINT ["/home/runner/entrypoint.sh"]
EOF
```

### 5.2 Build and Push Docker Image
```bash
# Build image
docker build -t github-actions-runner:latest .

# Tag for your registry (example using Docker Hub)
docker tag github-actions-runner:latest your-dockerhub-username/github-actions-runner:latest

# Push to registry
docker push your-dockerhub-username/github-actions-runner:latest
```

## Step 6: Create Runner Deployment

### 6.1 Create Deployment Template
```bash
cat > manifests/runner-deployment-template.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: github-runner-REPO_PLACEHOLDER
  namespace: NAMESPACE_PLACEHOLDER
spec:
  replicas: 2  # Adjust based on your needs
  selector:
    matchLabels:
      app: github-runner
  template:
    metadata:
      labels:
        app: github-runner
    spec:
      containers:
      - name: runner
        image: your-dockerhub-username/github-actions-runner:latest  # Update this!
        imagePullPolicy: Always
        env:
        - name: GITHUB_PAT
          valueFrom:
            secretKeyRef:
              name: github-credentials
              key: GITHUB_PAT
        - name: GITHUB_OWNER
          valueFrom:
            secretKeyRef:
              name: github-credentials
              key: GITHUB_OWNER
        - name: GITHUB_REPO
          valueFrom:
            secretKeyRef:
              name: github-credentials
              key: GITHUB_REPO
        volumeMounts:
        - name: runner-scripts
          mountPath: /home/runner/entrypoint.sh
          subPath: entrypoint.sh
          readOnly: true
        - name: docker-sock
          mountPath: /var/run/docker.sock
        securityContext:
          privileged: true  # Required for Docker-in-Docker
      volumes:
      - name: runner-scripts
        configMap:
          name: runner-scripts
          defaultMode: 0755
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
          type: Socket
EOF
```

### 6.2 Deploy Runners for Each Repository
```bash
# Create a deployment script
cat > scripts/deploy-runner.sh << 'EOF'
#!/bin/bash
# Usage: ./deploy-runner.sh <repo-name> <namespace-suffix> <docker-image> [replicas]

REPO_NAME=$1
NAMESPACE_SUFFIX=${2:-$1}
DOCKER_IMAGE=$3
REPLICAS=${4:-2}

NAMESPACE="runners-${NAMESPACE_SUFFIX}"

echo "Deploying runner for ${REPO_NAME} in namespace ${NAMESPACE}"

# Apply ConfigMap
sed "s/NAMESPACE_PLACEHOLDER/${NAMESPACE}/g" manifests/runner-scripts-configmap-template.yaml | kubectl apply -f -

# Apply Deployment
sed -e "s/NAMESPACE_PLACEHOLDER/${NAMESPACE}/g" \
    -e "s/REPO_PLACEHOLDER/${REPO_NAME}/g" \
    -e "s|your-dockerhub-username/github-actions-runner:latest|${DOCKER_IMAGE}|g" \
    -e "s/replicas: 2/replicas: ${REPLICAS}/g" \
    manifests/runner-deployment-template.yaml | kubectl apply -f -

echo "Deployment complete. Checking status..."
kubectl get pods -n ${NAMESPACE}
EOF

chmod +x scripts/deploy-runner.sh

# Example usage:
# ./scripts/deploy-runner.sh "my-web-app" "my-web-app" "myusername/github-actions-runner:latest" 3
# ./scripts/deploy-runner.sh "backend-api" "backend" "myusername/github-actions-runner:latest" 2
```

### 6.3 Complete Setup Script for Multiple Repos
```bash
cat > scripts/setup-all-runners.sh << 'EOF'
#!/bin/bash
# Complete setup for multiple repositories
# Usage: ./setup-all-runners.sh

# Configuration
GITHUB_PAT="your-pat-token-here"
GITHUB_OWNER="your-github-username-or-org"
DOCKER_IMAGE="your-dockerhub-username/github-actions-runner:latest"

# Define your repositories
declare -A REPOS=(
  ["my-web-app"]="2"      # repo-name:replicas
  ["backend-api"]="3"
  ["data-service"]="1"
)

echo "Setting up GitHub Actions runners for multiple repositories..."

for REPO in "${!REPOS[@]}"; do
  REPLICAS="${REPOS[$REPO]}"
  NAMESPACE="runners-${REPO}"
  
  echo "=== Setting up ${REPO} with ${REPLICAS} runners ==="
  
  # Create namespace
  kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
  
  # Create secret
  kubectl create secret generic github-credentials \
    --namespace="${NAMESPACE}" \
    --from-literal=GITHUB_PAT="${GITHUB_PAT}" \
    --from-literal=GITHUB_OWNER="${GITHUB_OWNER}" \
    --from-literal=GITHUB_REPO="${REPO}" \
    --dry-run=client -o yaml | kubectl apply -f -
  
  # Deploy runner
  ./scripts/deploy-runner.sh "${REPO}" "${REPO}" "${DOCKER_IMAGE}" "${REPLICAS}"
  
  echo ""
done

echo "All runners deployed. Final status:"
kubectl get pods -A | grep runners-
EOF

chmod +x scripts/setup-all-runners.sh
```

## Step 7: Verify Deployment

### 7.1 Check Pod Status
```bash
# Check all runner namespaces
kubectl get pods -A | grep runners-

# Check specific namespace
kubectl get pods -n runners-<your-repo-name>

# View logs for a specific repo's runners
kubectl logs -n runners-<your-repo-name> -l app=github-runner -f

# Check all runners across namespaces
for ns in $(kubectl get ns | grep runners- | awk '{print $1}'); do
  echo "=== Namespace: $ns ==="
  kubectl get pods -n $ns
  echo ""
done
```

### 7.2 Verify Runners in GitHub
1. Go to each of your GitHub repositories
2. Navigate to Settings → Actions → Runners
3. You should see your new runners with names like `k3d-runner-<pod-name>`
4. Each repository should show its own set of runners

## Step 8: Update GitHub Workflows

### 8.1 Update workflow to use self-hosted runners
```yaml
# In your .github/workflows/*.yml files
jobs:
  build:
    runs-on: [self-hosted, linux, x64, k3d]  # Use your custom labels
    # ... rest of your job
```

## Step 9: Monitoring and Maintenance

### 9.1 Monitor Runner Pods
```bash
# Create monitoring script for all runners
cat > scripts/monitor-all-runners.sh << 'EOF'
#!/bin/bash
echo "=== GitHub Runner Status Across All Namespaces ==="

for ns in $(kubectl get ns | grep runners- | awk '{print $1}'); do
  echo -e "\n--- Namespace: $ns ---"
  kubectl get pods -n $ns
  REPO=$(kubectl get secret github-credentials -n $ns -o jsonpath='{.data.GITHUB_REPO}' | base64 -d)
  echo "Repository: $REPO"
done

echo -e "\n=== Recent Logs ==="
for ns in $(kubectl get ns | grep runners- | awk '{print $1}'); do
  echo -e "\n--- Logs from $ns (last 5 lines) ---"
  kubectl logs -n $ns -l app=github-runner --tail=5 2>/dev/null || echo "No logs available"
done
EOF

chmod +x scripts/monitor-all-runners.sh
```

### 9.2 Scale Runners
```bash
# Scale runners for a specific repository
kubectl scale deployment github-runner-<repo-name> -n runners-<repo-name> --replicas=5

# Scale script for easy management
cat > scripts/scale-runner.sh << 'EOF'
#!/bin/bash
# Usage: ./scale-runner.sh <repo-name> <replicas>

REPO=$1
REPLICAS=$2
NAMESPACE="runners-${REPO}"

kubectl scale deployment github-runner-${REPO} -n ${NAMESPACE} --replicas=${REPLICAS}
echo "Scaled ${REPO} runners to ${REPLICAS} replicas"
EOF

chmod +x scripts/scale-runner.sh

# Usage: ./scripts/scale-runner.sh my-web-app 5
```

## Step 10: Troubleshooting

### Common Issues and Solutions

1. **Registration token failures**
   - Check PAT permissions (needs `repo` scope)
   - Verify PAT hasn't expired
   - Check GitHub API rate limits

2. **Docker permission issues**
   - Ensure runner user is in docker group
   - Check docker.sock mount permissions

3. **Runner not appearing in GitHub**
   - Check pod logs: `kubectl logs -n github-runners <pod-name>`
   - Verify network connectivity to GitHub

### Debug Commands
```bash
# Check secret in specific namespace
kubectl get secret github-credentials -n runners-<repo-name> -o yaml

# Exec into pod
kubectl exec -it -n runners-<repo-name> <pod-name> -- /bin/bash

# Test token generation manually
kubectl exec -it -n runners-<repo-name> <pod-name> -- /bin/bash -c 'curl -s -X POST -H "Authorization: token ${GITHUB_PAT}" -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/registration-token'

# Debug script for all runners
cat > scripts/debug-runners.sh << 'EOF'
#!/bin/bash
# Usage: ./debug-runners.sh [namespace-suffix]

if [ -n "$1" ]; then
  NAMESPACES="runners-$1"
else
  NAMESPACES=$(kubectl get ns | grep runners- | awk '{print $1}')
fi

for NS in $NAMESPACES; do
  echo "=== Debugging namespace: $NS ==="
  
  # Check deployments
  echo "Deployments:"
  kubectl get deployment -n $NS
  
  # Check pods
  echo -e "\nPods:"
  kubectl get pods -n $NS -o wide
  
  # Check events
  echo -e "\nRecent Events:"
  kubectl get events -n $NS --sort-by='.lastTimestamp' | tail -5
  
  # Check secret
  echo -e "\nSecret exists:"
  kubectl get secret github-credentials -n $NS >/dev/null 2>&1 && echo "Yes" || echo "No"
  
  echo -e "\n---\n"
done
EOF

chmod +x scripts/debug-runners.sh
```

## Security Best Practices

1. **Rotate PAT regularly** (every 90 days)
2. **Use least privilege** - only grant necessary scopes
3. **Monitor runner activity** in GitHub audit logs
4. **Isolate runner namespace** with network policies
5. **Consider using** GitHub App instead of PAT for production

## Next Steps

1. Set up autoscaling based on job queue
2. Add persistent storage for caching
3. Implement runner cleanup on termination
4. Set up alerts for failed runners
5. Consider using Actions Runner Controller (ARC) for more advanced features

## Estimated Timeline

- Steps 1-3: 15 minutes
- Steps 4-6: 30 minutes (including Docker build)
- Steps 7-8: 15 minutes
- Testing and verification: 30 minutes

**Total estimated time: 1.5 hours**

## Quick Start for Multiple Repositories

### Option 1: Manual Setup for Each Repo
```bash
# Set common variables
export GITHUB_PAT="your-pat-here"
export GITHUB_OWNER="your-username-or-org"
export DOCKER_IMAGE="your-dockerhub-username/github-actions-runner:latest"

# For each repository:
REPO="my-first-repo"
kubectl create namespace runners-${REPO}
kubectl create secret generic github-credentials \
  --namespace=runners-${REPO} \
  --from-literal=GITHUB_PAT="${GITHUB_PAT}" \
  --from-literal=GITHUB_OWNER="${GITHUB_OWNER}" \
  --from-literal=GITHUB_REPO="${REPO}"
# Then deploy using the scripts
```

### Option 2: Automated Setup (Recommended)
```bash
# 1. Edit scripts/setup-all-runners.sh to add your repos
# 2. Update the REPOS array with your repositories
# 3. Run the setup script
./scripts/setup-all-runners.sh
```

### Managing Runners
```bash
# Monitor all runners
./scripts/monitor-all-runners.sh

# Scale specific repo runners
./scripts/scale-runner.sh my-web-app 5

# Debug issues
./scripts/debug-runners.sh

# Check specific namespace
kubectl get pods -n runners-my-web-app
```

## Example: Setting Up 3 Repositories

```bash
# Quick example for 3 repos
export GITHUB_PAT="ghp_xxxxxxxxxxxx"
export GITHUB_OWNER="mycompany"
export DOCKER_IMAGE="mycompany/github-runner:latest"

# Create and deploy runners for each repo
for REPO in "frontend" "backend" "data-pipeline"; do
  ./scripts/create-runner-for-repo.sh "$REPO" "$GITHUB_OWNER" "$GITHUB_PAT"
  ./scripts/deploy-runner.sh "$REPO" "$REPO" "$DOCKER_IMAGE" 2
done

# Verify all runners are running
kubectl get pods -A | grep runners-
```
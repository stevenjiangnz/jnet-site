#!/bin/bash

# n8n Installation Script for k3d
set -e

echo "Starting n8n installation on k3d..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if k3d cluster is running
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: No Kubernetes cluster found. Please ensure k3d cluster is running."
    echo "You can start a k3d cluster with the setup/mac-setup instructions"
    exit 1
fi

echo "✓ Kubernetes cluster is accessible"

# Create n8n namespace
echo "Creating n8n namespace..."
kubectl create namespace n8n --dry-run=client -o yaml | kubectl apply -f -

# Check if secrets.yaml exists
SECRETS_FILE="$(dirname "$0")/resources/secrets.yaml"
if [ ! -f "$SECRETS_FILE" ]; then
    echo "Error: secrets.yaml not found!"
    echo "Please copy secrets.yaml.example to secrets.yaml and update with your values:"
    echo "  cp $(dirname "$0")/resources/secrets.yaml.example $(dirname "$0")/resources/secrets.yaml"
    echo "  Then edit the file with your secure passwords"
    exit 1
fi

# Apply secrets
echo "Applying secrets..."
kubectl apply -f "$SECRETS_FILE"

# Apply PostgreSQL deployment
echo "Deploying PostgreSQL database..."
kubectl apply -f "$(dirname "$0")/resources/postgres-deployment.yaml"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n n8n --timeout=300s

# Apply n8n deployment
echo "Deploying n8n..."
kubectl apply -f "$(dirname "$0")/resources/n8n-deployment.yaml"

# Apply NodePort service
echo "Creating NodePort service for external access..."
kubectl apply -f "$(dirname "$0")/resources/n8n-nodeport.yaml"

echo "n8n installation initiated. Waiting for pods to start..."
echo "This may take a few minutes for the containers to be pulled and started..."

# Wait for n8n deployment to be ready
echo "Waiting for n8n to be ready..."
kubectl wait --for=condition=available deployment/n8n-deployment -n n8n --timeout=300s

echo ""
echo "✓ n8n installation completed successfully!"
echo ""
echo "Access Methods:"
echo "1. Port Forward (recommended):"
echo "   ./port-forward.sh"
echo "   Then open: http://localhost:5678"
echo ""
echo "2. NodePort (if cluster has port 30082 exposed):"
echo "   Open: http://localhost:30082"
echo ""
echo "To check status: ./verify-n8n.sh"
echo "To monitor installation: ./monitor-install.sh"
echo ""
echo "First-time setup:"
echo "- Visit the URL and create your admin account"
echo "- Start building your workflows!"

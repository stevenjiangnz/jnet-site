#!/bin/bash

# n8n Port Forward Script
set -e

echo "Setting up port forwarding for n8n..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if n8n service exists
if ! kubectl get service n8n-service -n n8n &> /dev/null; then
    echo "Error: n8n service not found. Please install n8n first using ./install-n8n.sh"
    exit 1
fi

echo "Starting port forward from localhost:5678 to n8n service..."
echo "n8n will be accessible at: http://localhost:5678"
echo ""
echo "Press Ctrl+C to stop port forwarding"
echo ""

# Start port forwarding
kubectl port-forward svc/n8n-service 5678:5678 --namespace n8n

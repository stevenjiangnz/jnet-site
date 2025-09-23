#!/bin/bash

# n8n Uninstallation Script (Keep Data)
set -e

echo "Starting n8n uninstallation (keeping data)..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if n8n namespace exists
if ! kubectl get namespace n8n &> /dev/null; then
    echo "n8n namespace not found. Nothing to uninstall."
    exit 0
fi

echo "Removing n8n deployment..."
kubectl delete deployment n8n-deployment -n n8n --ignore-not-found=true

echo "Removing n8n services..."
kubectl delete service n8n-service -n n8n --ignore-not-found=true
kubectl delete service n8n-nodeport -n n8n --ignore-not-found=true

echo "Removing PostgreSQL deployment..."
kubectl delete deployment postgres -n n8n --ignore-not-found=true

echo "Removing PostgreSQL service..."
kubectl delete service postgres-service -n n8n --ignore-not-found=true

echo "Removing PostgreSQL secret..."
kubectl delete secret postgres-secret -n n8n --ignore-not-found=true

echo "Data preservation:"
echo "✓ Persistent Volume Claims are preserved"
echo "✓ Your n8n workflows and data will be available if you reinstall"

# Show what's left
echo ""
echo "Remaining resources in n8n namespace:"
kubectl get all,pvc,secrets -n n8n

echo ""
echo "✓ n8n uninstallation completed!"
echo ""
echo "To completely remove everything including data: ./uninstall-n8n-clean.sh"
echo "To reinstall: ./install-n8n.sh"

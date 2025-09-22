#!/bin/bash

# n8n Complete Uninstallation Script for k3d
# This script removes everything including persistent data
set -e

echo "Starting complete n8n uninstallation (including data)..."

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

echo "Removing persistent volume claims (this will delete all data)..."
kubectl delete pvc --all -n n8n --timeout=60s || echo "No PVCs found or timeout reached"

# Force cleanup stuck PVCs if they exist
echo "Force cleaning stuck persistent volume claims..."
kubectl get pvc -n n8n --no-headers 2>/dev/null | awk '{print $1}' | xargs -I {} kubectl patch pvc {} -n n8n -p '{"metadata":{"finalizers":null}}' 2>/dev/null || echo "No stuck PVCs to clean"

echo "Removing persistent volumes..."
kubectl delete pv -l app=n8n --ignore-not-found=true || echo "No PVs found"

echo "Removing secrets..."
kubectl delete secret postgres-secret -n n8n --ignore-not-found=true

echo "Removing n8n namespace..."
kubectl delete namespace n8n --timeout=120s || echo "Namespace already deleted"

# Force cleanup stuck namespace if needed
if kubectl get namespace n8n &> /dev/null; then
    echo "Force removing stuck namespace..."
    kubectl get namespace n8n -o json | jq '.spec.finalizers = []' | kubectl replace --raw "/api/v1/namespaces/n8n/finalize" -f - || echo "Force cleanup not needed"
fi

echo "✓ Complete n8n uninstallation finished!"
echo ""
echo "All n8n data has been permanently removed."
echo "You can now run './install-n8n.sh' to do a fresh installation."

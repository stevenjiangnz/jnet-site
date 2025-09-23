#!/bin/bash

# n8n Installation Monitor Script
set -e

echo "Monitoring n8n installation progress..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if n8n namespace exists
if ! kubectl get namespace n8n &> /dev/null; then
    echo "n8n namespace not found. Please run ./install-n8n.sh first"
    exit 1
fi

echo "Monitoring n8n namespace..."
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to display status
show_status() {
    echo "==================== $(date) ===================="
    
    echo "📦 Pods Status:"
    kubectl get pods -n n8n -o wide
    
    echo ""
    echo "🔧 Services:"
    kubectl get svc -n n8n
    
    echo ""
    echo "💾 Persistent Volume Claims:"
    kubectl get pvc -n n8n
    
    echo ""
    echo "🚀 Deployments:"
    kubectl get deployments -n n8n
    
    echo ""
    echo "📊 Events (last 10):"
    kubectl get events -n n8n --sort-by='.lastTimestamp' | tail -10
    
    echo ""
    echo "=========================================================="
    echo ""
}

# Show initial status
show_status

# Monitor in a loop
while true; do
    sleep 30
    show_status
done

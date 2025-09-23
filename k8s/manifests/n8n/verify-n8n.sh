#!/bin/bash

# n8n Verification Script
set -e

echo "Verifying n8n installation..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if n8n namespace exists
if ! kubectl get namespace n8n &> /dev/null; then
    echo "❌ n8n namespace not found"
    echo "Please run ./install-n8n.sh first"
    exit 1
fi

echo "✓ n8n namespace exists"

# Check PostgreSQL deployment
echo "Checking PostgreSQL deployment..."
if kubectl get deployment postgres -n n8n &> /dev/null; then
    POSTGRES_READY=$(kubectl get deployment postgres -n n8n -o jsonpath='{.status.readyReplicas}')
    POSTGRES_DESIRED=$(kubectl get deployment postgres -n n8n -o jsonpath='{.spec.replicas}')
    
    if [ "$POSTGRES_READY" = "$POSTGRES_DESIRED" ]; then
        echo "✓ PostgreSQL deployment is ready ($POSTGRES_READY/$POSTGRES_DESIRED replicas)"
    else
        echo "⚠️ PostgreSQL deployment not ready ($POSTGRES_READY/$POSTGRES_DESIRED replicas)"
    fi
else
    echo "❌ PostgreSQL deployment not found"
fi

# Check n8n deployment
echo "Checking n8n deployment..."
if kubectl get deployment n8n-deployment -n n8n &> /dev/null; then
    N8N_READY=$(kubectl get deployment n8n-deployment -n n8n -o jsonpath='{.status.readyReplicas}')
    N8N_DESIRED=$(kubectl get deployment n8n-deployment -n n8n -o jsonpath='{.spec.replicas}')
    
    if [ "$N8N_READY" = "$N8N_DESIRED" ]; then
        echo "✓ n8n deployment is ready ($N8N_READY/$N8N_DESIRED replicas)"
    else
        echo "⚠️ n8n deployment not ready ($N8N_READY/$N8N_DESIRED replicas)"
    fi
else
    echo "❌ n8n deployment not found"
fi

# Check services
echo "Checking services..."
if kubectl get service postgres-service -n n8n &> /dev/null; then
    echo "✓ PostgreSQL service exists"
else
    echo "❌ PostgreSQL service not found"
fi

if kubectl get service n8n-service -n n8n &> /dev/null; then
    echo "✓ n8n service exists"
else
    echo "❌ n8n service not found"
fi

if kubectl get service n8n-nodeport -n n8n &> /dev/null; then
    echo "✓ n8n NodePort service exists"
    NODE_PORT=$(kubectl get service n8n-nodeport -n n8n -o jsonpath='{.spec.ports[0].nodePort}')
    echo "  NodePort: $NODE_PORT"
else
    echo "❌ n8n NodePort service not found"
fi

# Check persistent volumes
echo "Checking persistent volumes..."
if kubectl get pvc postgres-pvc -n n8n &> /dev/null; then
    PVC_STATUS=$(kubectl get pvc postgres-pvc -n n8n -o jsonpath='{.status.phase}')
    if [ "$PVC_STATUS" = "Bound" ]; then
        echo "✓ PostgreSQL PVC is bound"
    else
        echo "⚠️ PostgreSQL PVC status: $PVC_STATUS"
    fi
else
    echo "❌ PostgreSQL PVC not found"
fi

# Test database connectivity
echo "Testing database connectivity..."
POSTGRES_POD=$(kubectl get pods -n n8n -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$POSTGRES_POD" ]; then
    if kubectl exec $POSTGRES_POD -n n8n -- pg_isready -U n8n -d n8n &> /dev/null; then
        echo "✓ PostgreSQL is accepting connections"
    else
        echo "⚠️ PostgreSQL connection test failed"
    fi
else
    echo "❌ PostgreSQL pod not found"
fi

# Test n8n health
echo "Testing n8n health..."
N8N_POD=$(kubectl get pods -n n8n -l app=n8n -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$N8N_POD" ]; then
    if kubectl exec $N8N_POD -n n8n -- wget -q --spider http://localhost:5678/healthz &> /dev/null; then
        echo "✓ n8n health check passed"
    else
        echo "⚠️ n8n health check failed"
    fi
else
    echo "❌ n8n pod not found"
fi

echo ""
echo "📊 Summary:"
kubectl get pods -n n8n

echo ""
echo "🌐 Access Information:"
echo "Port Forward: ./port-forward.sh then http://localhost:5678"
if [ -n "$NODE_PORT" ]; then
    echo "NodePort: http://localhost:$NODE_PORT (if cluster has port exposed)"
fi

echo ""
echo "📝 Useful commands:"
echo "View logs: kubectl logs deployment/n8n-deployment -n n8n -f"
echo "Check status: kubectl get all -n n8n"

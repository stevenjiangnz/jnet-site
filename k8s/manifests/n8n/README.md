# n8n Installation on k3d

This directory contains all the necessary files and documentation to install and manage n8n on a k3d Kubernetes cluster.

## Directory Structure

```
n8n/
├── README.md                 # This documentation
├── install-n8n.sh            # Installation script
├── verify-n8n.sh             # Verification script
├── uninstall-n8n.sh          # Uninstallation script (keep data)
├── uninstall-n8n-clean.sh    # Complete uninstallation script
├── monitor-install.sh         # Installation monitoring script
├── port-forward.sh            # Port forwarding script
└── resources/                 # Kubernetes manifests
    ├── postgres-deployment.yaml  # PostgreSQL database
    ├── n8n-deployment.yaml       # n8n application
    └── n8n-nodeport.yaml         # NodePort service
```

## Overview

n8n is a powerful workflow automation tool that allows you to connect different services and automate tasks. This setup uses a custom Kubernetes deployment with PostgreSQL database and provides access via port forwarding or NodePort.

## Prerequisites

- [k3d](https://k3d.io/) installed and cluster running
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- Optional: k3d cluster with port 30082 exposed for NodePort access

## Quick Start

### 1. Set up Secrets

Before installing, you need to create your secrets file:

```bash
# Copy the example secrets file
cp resources/secrets.yaml.example resources/secrets.yaml

# Edit secrets.yaml and replace placeholder values with secure passwords
# Generate secure passwords:
# - PostgreSQL password: openssl rand -base64 16
# - Encryption key: openssl rand -base64 32

# Then base64 encode them:
# echo -n "your-password" | base64
```

**Important**: Never commit `secrets.yaml` to version control!

### 2. Install n8n

Run the installation script:

```bash
./install-n8n.sh
```

This script will:
- Create the n8n namespace
- Deploy PostgreSQL database for n8n
- Deploy n8n with proper configuration
- Create NodePort service for external access

### 3. Access n8n UI

#### Option A: Port Forwarding (Recommended)

Use the provided script to set up port forwarding:

```bash
./port-forward.sh
```

Or manually:

```bash
kubectl port-forward svc/n8n-service 5678:5678 --namespace n8n
```

Then access:
- **URL**: http://localhost:5678

#### Option B: NodePort (k3d with exposed ports)

If you created your k3d cluster with port 30082 exposed:

```bash
k3d cluster create mycluster --port "30082:30082@server:0"
```

Then access:
- **URL**: http://localhost:30082

### 4. Initial Setup

When you first access n8n, you'll need to:
1. Create an admin account
2. Set up your first workflow
3. Configure any external service connections

## Available Scripts

### Installation and Setup

- `./install-n8n.sh` - Install n8n with PostgreSQL
- `./verify-n8n.sh` - Check if n8n is running properly
- `./port-forward.sh` - Set up port forwarding for local access

### Monitoring and Debugging

- `./monitor-install.sh` - Monitor the installation progress

### Cleanup and Uninstallation

- `./uninstall-n8n.sh` - Remove n8n but keep data
- `./uninstall-n8n-clean.sh` - Complete removal including all data

## Configuration

### Default Settings

- **Namespace**: n8n
- **Database**: PostgreSQL (deployed in same namespace)
- **n8n Port**: 5678
- **NodePort**: 30082
- **Database Name**: n8n
- **Database User**: n8n

### Environment Variables

The n8n deployment includes these key environment variables:
- `DB_TYPE=postgresdb`
- `DB_POSTGRESDB_HOST=postgres-service`
- `DB_POSTGRESDB_DATABASE=n8n`
- `DB_POSTGRESDB_USER=n8n`
- `N8N_BASIC_AUTH_ACTIVE=false` (disable basic auth, use n8n's built-in auth)
- `WEBHOOK_URL=http://localhost:5678/` (adjust for your setup)

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check if cluster has enough resources
   ```bash
   kubectl get pods -n n8n
   kubectl describe pod <pod-name> -n n8n
   ```

2. **Database connection issues**: Verify PostgreSQL is running
   ```bash
   kubectl logs deployment/postgres -n n8n
   ```

3. **Port forwarding issues**: Ensure no other service is using port 5678
   ```bash
   lsof -i :5678
   ```

### Useful Commands

```bash
# Check all n8n resources
kubectl get all -n n8n

# View n8n logs
kubectl logs deployment/n8n-deployment -n n8n -f

# View PostgreSQL logs
kubectl logs deployment/postgres -n n8n -f

# Get service details
kubectl get svc -n n8n

# Check persistent volumes
kubectl get pv,pvc -n n8n
```

## Data Persistence

- PostgreSQL data is stored in a persistent volume (5Gi)
- n8n data is stored in a persistent volume (2Gi)
- n8n workflows and credentials are persisted in the database
- All credentials are encrypted using the encryption key
- Data survives pod restarts and updates

## Backup and Restore

To backup your n8n data:

```bash
# Get PostgreSQL pod name
kubectl get pods -n n8n | grep postgres

# Create a backup
kubectl exec -it <postgres-pod-name> -n n8n -- pg_dump -U n8n n8n > n8n-backup.sql
```

To restore:

```bash
kubectl exec -i <postgres-pod-name> -n n8n -- psql -U n8n n8n < n8n-backup.sql
```

## Updating n8n

To update to a newer version of n8n:

1. Edit the image tag in the deployment files
2. Apply the changes:
   ```bash
   kubectl apply -f resources/n8n-deployment.yaml
   ```

## Security Considerations

### Secrets Management
- **Never commit** `secrets.yaml` to version control
- Use strong, randomly generated passwords
- Store encryption key securely - it's needed to decrypt credentials
- Rotate passwords regularly in production

### Network Security
- Configure proper ingress with TLS for external access
- Update `WEBHOOK_URL` in deployment when exposing webhooks externally
- Use NetworkPolicies to restrict pod-to-pod communication
- Consider using service mesh for advanced security

### Authentication
- n8n's built-in authentication is enabled (basic auth disabled)
- Create strong admin passwords on first login
- Use SSO/SAML if available in your organization
- Enable 2FA for admin accounts

### For Production
- Use managed PostgreSQL services with encryption at rest
- Enable audit logging
- Implement backup and disaster recovery procedures
- Monitor for security vulnerabilities

## Support

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community](https://community.n8n.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

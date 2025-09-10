# Docker Port Mapping OAuth Issue (RESOLVED)

## Problem (Fixed)

When using Docker with port mapping (3110:3100), OAuth callbacks were redirecting to port 3100 instead of 3110 because:
- Docker mapped external port 3110 to internal port 3100
- Next.js app inside container saw itself running on port 3100
- OAuth callback used the internal port, not the external one

## Solution Implemented

We implemented Option 1 - aligning internal and external ports to use the same port (3110):

### Changes Made:

1. **Updated docker-compose.yml**:
```yaml
frontend:
  ports:
    - "3110:3110"  # Same port inside and outside
```

2. **Updated Dockerfile.dev**:
```dockerfile
# Expose port
EXPOSE 3110

# Start development server with port 3110
CMD ["npm", "run", "dev", "--", "-p", "3110"]
```

### Result

✅ OAuth now correctly redirects to http://localhost:3110/auth/callback when accessing the Docker environment

## Current Port Configuration

- **Local development**: Port 3100 (`npm run dev`)
- **Docker development**: Port 3110 (internal and external)
- **Production**: Cloud Run URL (https://frontend-506487697841.us-central1.run.app)

## No Image Rebuild Required

The fix only required:
1. Rebuilding the frontend image once: `./scripts/docker-build.sh frontend`
2. Restarting containers: `./scripts/docker-down.sh && ./scripts/docker-up.sh`

Future changes to docker-compose.yml port mappings don't require rebuilding images.
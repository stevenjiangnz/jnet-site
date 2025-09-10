# Docker Port Mapping OAuth Issue

## Problem

When using Docker with port mapping (3110:3100), OAuth callbacks redirect to port 3100 instead of 3110 because:
- Docker maps external port 3110 to internal port 3100
- Next.js app inside container sees itself running on port 3100
- OAuth callback uses the internal port, not the external one

## Solutions

### Option 1: Use Same Port (Recommended)

Change docker-compose.yml to use the same internal and external port:

```yaml
frontend:
  ports:
    - "3110:3110"  # Same port inside and outside
```

Then update the Dockerfile.dev to run Next.js on port 3110:

```dockerfile
CMD ["npm", "run", "dev", "--", "-p", "3110"]
```

### Option 2: Add Port Detection Logic

Add logic to detect the actual port being used from the browser's perspective. This is more complex and may not work reliably.

### Option 3: Use Separate Environments

- Local development: Always use port 3100
- Docker development: Always use Docker Compose with proper port mapping
- Production: Use Cloud Run URL

## Quick Fix for Testing

For now, when testing with Docker:
1. Access the app at http://localhost:3110
2. After OAuth redirect to port 3100, manually change the URL to port 3110
3. You'll still be authenticated due to shared cookies on localhost

## Long-term Solution

The best approach is to ensure consistency:
- If using Docker locally, always access through Docker (port 3110)
- If developing locally without Docker, always use port 3100
- Don't mix the two approaches in the same session
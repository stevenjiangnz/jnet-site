# Build Command

Build all Docker images for production deployment.

## Usage
```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker build -t jnetsolution/frontend ./frontend
docker build -t jnetsolution/auth-service ./services/auth-service
```

## Google Cloud Run Preparation
```bash
# Tag for GCR
docker tag jnetsolution/frontend gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
docker tag jnetsolution/auth-service gcr.io/YOUR_PROJECT_ID/jnetsolution-auth

# Push to registry
docker push gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
```
# Build Command

Build all Docker images for production deployment.

## Usage
```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker build -t jnetsolution/frontend ./frontend
docker build -t jnetsolution/user-service ./services/user-service
docker build -t jnetsolution/content-service ./services/content-service
```

## Google Cloud Run Preparation
```bash
# Tag for GCR
docker tag jnetsolution/frontend gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
docker tag jnetsolution/user-service gcr.io/YOUR_PROJECT_ID/jnetsolution-user
docker tag jnetsolution/content-service gcr.io/YOUR_PROJECT_ID/jnetsolution-content

# Push to registry
docker push gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
```
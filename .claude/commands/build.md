# Build Command

Build all Docker images for production deployment.

## Usage
```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker build -t jnetsolution/frontend ./frontend
docker build -t jnetsolution/stock-data-service ./services/stock-data-service
docker build -t jnetsolution/api-service ./services/api-service
```

## Google Cloud Run Preparation
```bash
# Tag for GCR
docker tag jnetsolution/frontend gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
docker tag jnetsolution/stock-data-service gcr.io/YOUR_PROJECT_ID/jnetsolution-stock-data
docker tag jnetsolution/api-service gcr.io/YOUR_PROJECT_ID/jnetsolution-api

# Push to registry
docker push gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
```
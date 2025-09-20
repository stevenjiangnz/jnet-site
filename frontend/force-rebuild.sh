#!/bin/bash
# Force rebuild frontend without cache

cd "$(dirname "$0")"

# Get the current git commit hash
COMMIT_HASH=$(git rev-parse HEAD)
echo "Building frontend for commit: $COMMIT_HASH"

# Build with no cache
docker build --no-cache -t stevenjiangnz/jnet-frontend:develop-${COMMIT_HASH} .

# Also tag as develop
docker tag stevenjiangnz/jnet-frontend:develop-${COMMIT_HASH} stevenjiangnz/jnet-frontend:develop

echo "Build complete. Now push and deploy:"
echo "docker push stevenjiangnz/jnet-frontend:develop-${COMMIT_HASH}"
echo "docker push stevenjiangnz/jnet-frontend:develop"
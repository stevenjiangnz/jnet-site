# JNetSolution Local Development Environment Setup

## Project Structure

```
jnetsolution/
├── .claude/                          # Claude Code configuration
│   ├── config.json
│   ├── commands/
│   │   ├── deploy.md
│   │   ├── test.md
│   │   └── build.md
│   └── context/
├── prd/                              # Product Requirements & Context Engineering
│   ├── architecture.md
│   ├── requirements.md
│   ├── user-stories.md
│   └── tech-stack.md
├── frontend/                         # Next.js/React main site
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── next.config.js
│   ├── package.json
│   └── src/
├── services/                         # Backend microservices
│   ├── user-service/                 # Python service
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── src/
├── docker-compose.yml                # Local development orchestration
├── docker-compose.prod.yml           # Production-like testing
├── .env.example
├── .env.local
├── README.md
└── scripts/
    ├── setup.sh
    ├── deploy.sh
    └── test-all.sh
```

## 1. Claude Code Configuration

### `.claude/config.json`
```json
{
  "project": {
    "name": "jnetsolution",
    "description": "Personal public site with microservices architecture",
    "type": "fullstack-web",
    "technologies": ["nextjs", "react", "docker", "gcp", "microservices"]
  },
  "development": {
    "framework": "nextjs",
    "containerization": "docker",
    "deployment": "google-cloud-run"
  },
  "commands": {
    "build": "Build all services and frontend",
    "test": "Run comprehensive test suite",
    "deploy": "Deploy to Google Cloud Run",
    "dev": "Start local development environment"
  },
  "context": {
    "include": ["prd/**/*.md", "README.md", "docker-compose.yml"],
    "exclude": ["node_modules/**", "dist/**", "build/**"]
  }
}
```

### `.claude/commands/dev.md`
```markdown
# Development Command

Start the local development environment with all services.

## Usage
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up frontend

# View logs
docker-compose logs -f frontend
```

## Services Started
- Frontend (Next.js): http://localhost:3000
- User Service (Python): http://localhost:8001

## Development Workflow
1. Make changes to code
2. Services will auto-reload (volume mounts)
3. Test changes at respective ports
4. Run tests: `npm run test` or `docker-compose exec frontend npm test`
```

### `.claude/commands/build.md`
```markdown
# Build Command

Build all Docker images for production deployment.

## Usage
```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker build -t jnetsolution/frontend ./frontend
```

## Google Cloud Run Preparation
```bash
# Tag for GCR
docker tag jnetsolution/frontend gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend

# Push to registry
docker push gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend
```
```

### `.claude/commands/deploy.md`
```markdown
# Deploy Command

Deploy services to Google Cloud Run.

## Prerequisites
- Google Cloud CLI installed and authenticated
- Project ID configured
- Cloud Run API enabled

## Usage
```bash
# Deploy frontend
gcloud run deploy jnetsolution-frontend \
  --image gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy user service
gcloud run deploy jnetsolution-user \
  --image gcr.io/YOUR_PROJECT_ID/jnetsolution-user \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated
```

## Environment Variables
Set these in Cloud Run console or via CLI:
- `DATABASE_URL`
- `JWT_SECRET`
- `API_BASE_URL`
```

## 2. Product Requirements & Context Engineering

### `prd/architecture.md`
```markdown
# JNetSolution Architecture

## Overview
Personal public site with microservices backend architecture, designed for scalability and maintainability.

## Frontend
- **Technology**: Next.js 14+ with React
- **Deployment**: Google Cloud Run
- **Features**: SSR, SEO optimization, responsive design

## Backend Services
- **User Service** (Python FastAPI): User profiles, preferences
- **Authentication**: Handled by Supabase Auth

## Data Flow
1. Frontend authenticates via Supabase Auth
2. Authenticated requests to User/Content services
3. Services communicate via internal APIs
4. Shared database or service-specific databases

## Deployment Strategy
- Each service deployed as separate Cloud Run service
- Frontend as static/SSR Cloud Run service
- Load balancer for routing
- Cloud SQL for persistent data
```

### `prd/requirements.md`
```markdown
# Functional Requirements

## User Features
- [ ] Landing page with portfolio showcase
- [ ] Blog section with markdown support
- [ ] Contact form with email integration
- [ ] User authentication (optional)
- [ ] Admin panel for content management

## Technical Requirements
- [ ] Mobile-responsive design
- [ ] SEO optimized
- [ ] Fast loading (< 3s)
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Analytics integration

## Development Requirements
- [ ] Local development with Docker
- [ ] CI/CD pipeline
- [ ] Automated testing
- [ ] Code quality checks
- [ ] Security scanning
```

## 3. Docker Configuration

### `docker-compose.yml` (Development)
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - API_BASE_URL=http://localhost:8000
    depends_on:
      - user-service
  user-service:
    build:
      context: ./services/user-service
      dockerfile: Dockerfile.dev
    ports:
      - "8001:8000"
    volumes:
      - ./services/user-service:/app
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=postgresql://dev:devpass@db:5432/jnetsolution

  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=jnetsolution
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=devpass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 4. Frontend Setup (Next.js)

### `frontend/Dockerfile`
```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### `frontend/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: []
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000'
  }
}

module.exports = nextConfig
```

## 5. Setup Scripts

### `scripts/setup.sh`
```bash
#!/bin/bash

echo "Setting up JNetSolution development environment..."

# Create directory structure
mkdir -p {frontend,services/user-service,prd,.claude/{commands,context}}

# Copy environment file
cp .env.example .env.local

# Install dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build Docker images
echo "Building Docker images..."
docker-compose build

# Start services
echo "Starting development environment..."
docker-compose up -d

echo "✅ Setup complete!"
echo "Frontend: http://localhost:3000"
echo "Services: Check docker-compose logs for status"
```

## 6. Getting Started

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd jnetsolution
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start development:**
   ```bash
   docker-compose up -d
   ```

4. **Use Claude Code:**
   ```bash
   claude-code dev    # Start development environment
   claude-code build  # Build for production
   claude-code deploy # Deploy to Cloud Run
   ```

## 7. Next Steps

1. Set up Google Cloud Project and enable APIs
2. Configure Cloud SQL database
3. Set up CI/CD pipeline (GitHub Actions)
4. Configure domain and SSL certificates
5. Set up monitoring and logging
6. Implement security best practices

This structure provides a solid foundation for your personal site with room to grow into a full microservices architecture.
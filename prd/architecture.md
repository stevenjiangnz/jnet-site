# JNetSolution Architecture

## Overview
Personal public site with microservices backend architecture, designed for scalability and maintainability.

## Frontend
- **Technology**: Next.js 14+ with React
- **Deployment**: Google Cloud Run
- **Features**: SSR, SEO optimization, responsive design

## Backend Services
- **Auth Service** (.NET 8): User authentication, JWT tokens
- **Stock Data Service** (Python FastAPI): Stock/ETF data management
- **API Service** (Python FastAPI): Business logic, analysis, notifications

## Data Flow
1. Frontend authenticates via Auth Service
2. Authenticated requests to backend services
3. Services communicate via internal APIs
4. Shared database or service-specific databases

## Deployment Strategy
- Each service deployed as separate Cloud Run service
- Frontend as static/SSR Cloud Run service
- Load balancer for routing
- Cloud SQL for persistent data
# JNetSolution Architecture

## Overview

JNetSolution is a modern web application built with a microservices architecture, utilizing Supabase for authentication and database services, with additional backend services for specific functionality.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end
    
    subgraph "Frontend Layer"
        NextJS[Next.js 15.4<br/>React 19, TypeScript]
    end
    
    subgraph "Authentication Layer"
        Supabase[Supabase Auth<br/>Email/Password & OAuth]
    end
    
    subgraph "Backend Services"
        AuthService[Auth Service<br/>.NET 8 - Legacy]
        StockService[Stock Data Service<br/>Python FastAPI + uv]
    end
    
    subgraph "Data Layer"
        SupabaseDB[(Supabase DB<br/>PostgreSQL)]
        LocalDB[(Local PostgreSQL<br/>For Services)]
        FileStorage[File Storage<br/>Stock Data JSON/CSV]
    end
    
    Browser --> NextJS
    NextJS --> Supabase
    NextJS --> StockService
    
    Supabase --> SupabaseDB
    StockService --> FileStorage
    AuthService --> LocalDB
```

## Component Details

### Frontend (Next.js)

**Technology Stack:**
- Next.js 15.4 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase JS Client

**Key Features:**
- Server-side rendering (SSR) for SEO
- Client-side authentication with Supabase
- Protected routes using middleware
- Responsive design
- Real-time session management

**Directory Structure:**
```
frontend/src/
├── app/                  # App Router pages
│   ├── (auth)/          # Auth-related pages
│   ├── price/           # Stock price charts
│   ├── symbols/         # Symbol management
│   └── api/             # API routes
├── providers/           # React contexts
├── utils/               # Utilities
│   └── supabase/       # Supabase clients
└── middleware.ts        # Auth middleware
```

### Authentication (Supabase)

**Features:**
- Email/Password authentication
- Google OAuth integration
- Session management with automatic refresh
- Secure cookie-based sessions
- Row Level Security (RLS) ready

**Authentication Flow:**
1. User initiates login (email or OAuth)
2. Supabase handles authentication
3. Session stored in secure cookies
4. Middleware validates session on each request
5. Client components use AuthContext for state

### Backend Services


#### Stock Data Service (Python FastAPI + uv)
- EOD stock/ETF data fetching
- Yahoo Finance integration
- Local file storage (JSON/CSV)
- Rate-limited API calls
- Bulk download support

#### Auth Service (.NET 8) - Legacy
- JWT token generation
- Being migrated to Supabase
- Will be deprecated

## Data Architecture

### Supabase Database
- User authentication data
- User profiles
- OAuth provider information
- Session management

### Local PostgreSQL
- Service-specific data
- Blog posts and content
- User preferences
- Application metadata

### File Storage
- Stock market data (JSON/CSV)
- Organized by symbol and date
- Persistent Docker volumes

## Security Architecture

### Authentication & Authorization
- Supabase handles authentication
- Row Level Security (RLS) for data access
- Secure session cookies
- CORS configuration for production

### API Security
- Environment-specific API keys
- Rate limiting on external API calls
- Input validation and sanitization
- HTTPS enforcement in production

## Deployment Architecture

### Development Environment
```
Docker Compose Setup:
- Frontend: Port 3110 (Docker) / 3100 (Local)
- Auth Service: Port 5001
- Stock Service: Port 9001
- PostgreSQL: Port 5432
```

### Production Environment (Google Cloud Run)
```
Cloud Run Services:
- Frontend: Public access, auto-scaling
- Backend Services: Authenticated access
- Environment variables via Secret Manager
- Cloud SQL for production database
```

## Environment Configuration

### Development
```env
# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Local Services
DATABASE_URL=postgresql://dev:devpass@localhost:5432/jnetsolution
```

### Production
```env
# Set via Cloud Run environment variables
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Performance Considerations

### Frontend Optimization
- Next.js Turbopack for fast development
- Static asset optimization
- Code splitting and lazy loading
- Image optimization with next/image

### Backend Optimization
- Connection pooling for databases
- Caching strategies for frequently accessed data
- Pagination for large datasets
- Rate limiting for external APIs

### Database Optimization
- Indexes on commonly queried fields
- Query optimization
- Connection pooling
- Regular maintenance and backups

## Monitoring & Observability

### Application Monitoring
- Health check endpoints on all services
- Error tracking and logging
- Performance metrics
- User analytics (privacy-compliant)

### Infrastructure Monitoring
- Cloud Run metrics
- Database performance monitoring
- API usage tracking
- Cost monitoring

## Future Architecture Considerations

### Planned Improvements
1. Complete migration from legacy Auth Service to Supabase
2. Implement caching layer (Redis)
3. Add CDN for static assets
4. Implement API Gateway for backend services
5. Add message queue for async operations

### Scalability Plans
1. Horizontal scaling via Cloud Run
2. Database read replicas for performance
3. Microservice decomposition as needed
4. Event-driven architecture for real-time features
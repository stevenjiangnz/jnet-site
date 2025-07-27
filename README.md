# JNetSolution

Personal public site with microservices architecture, built with modern web technologies and deployed on Google Cloud Run.

## 🏗️ Architecture

- **Frontend**: Next.js 14+ with React, TypeScript, and Tailwind CSS
- **Auth Service**: ASP.NET Core 8 with JWT authentication
- **User Service**: Python FastAPI for user management
- **Content Service**: Node.js Express for blog and portfolio content
- **Database**: PostgreSQL 15

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- .NET SDK 8.0+ (for Auth Service development)
- Python 3.11+ (for User Service development)

### Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd jnetsolution
   ```

2. Run the setup script:
   ```bash
   ./scripts/setup.sh
   ```

3. Update environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Access the services:
   - Frontend: http://localhost:3000
   - Auth Service: http://localhost:5001
   - User Service: http://localhost:8001
   - Content Service: http://localhost:3001

## 📁 Project Structure

```
jnetsolution/
├── frontend/                # Next.js frontend application
├── services/               # Backend microservices
│   ├── auth-service/      # .NET authentication service
│   ├── user-service/      # Python user management service
│   └── content-service/   # Node.js content management service
├── prd/                   # Product requirements and documentation
├── .claude/               # Claude Code configuration
├── scripts/              # Utility scripts
└── docker-compose.yml    # Local development orchestration
```

## 🛠️ Development

### Running Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Running Tests

```bash
./scripts/test-all.sh
```

## 🚢 Deployment

Deploy to Google Cloud Run:

```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

## 📝 Features

- [ ] Landing page with portfolio showcase
- [ ] Blog section with markdown support
- [ ] Contact form with email integration
- [ ] User authentication (optional)
- [ ] Admin panel for content management
- [ ] Mobile-responsive design
- [ ] SEO optimized
- [ ] Fast loading (< 3s)
- [ ] Accessible (WCAG 2.1 AA)

## 🔧 Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: .NET Core, Python FastAPI, Node.js Express
- **Database**: PostgreSQL
- **Containerization**: Docker
- **Deployment**: Google Cloud Run
- **CI/CD**: GitHub Actions (to be configured)

## 📄 License

This project is licensed under the MIT License.
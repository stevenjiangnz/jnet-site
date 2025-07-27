# Development Command

Start the local development environment with all services.

## Usage
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up frontend
docker-compose up auth-service

# View logs
docker-compose logs -f frontend
```

## Services Started
- Frontend (Next.js): http://localhost:3000
- Auth Service (.NET): http://localhost:5001
- User Service (Python): http://localhost:8001
- Content Service (Node.js): http://localhost:3001

## Development Workflow
1. Make changes to code
2. Services will auto-reload (volume mounts)
3. Test changes at respective ports
4. Run tests: `npm run test` or `docker-compose exec frontend npm test`
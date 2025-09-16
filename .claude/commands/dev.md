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
- Frontend (Next.js): http://localhost:3110
- Stock Data Service (Python): http://localhost:9001
- API Service (Python): http://localhost:8002

## Development Workflow
1. Make changes to code
2. Services will auto-reload (volume mounts)
3. Test changes at respective ports
4. Run tests: `npm run test` or `docker-compose exec frontend npm test`
# Docker Setup Guide

This project now uses Docker for standardized development and production environments, making it easy to run the same setup locally and on servers.

## Quick Start

### Option 1: Interactive Setup
```bash
./docker-start.sh
```
This will prompt you to choose between development and production environments.

### Option 2: Direct Commands

**Development Environment:**
```bash
./start-dev-docker.sh
```

**Production Environment:**
```bash
./start-prod-docker.sh
```

## Environments

### Development Environment
- **File:** `docker/docker-compose.dev.yml`
- **Features:**
  - Volume mounts for live code development
  - Development-friendly logging
  - Exposed ports for debugging
  - Database initialization with sample data
- **Ports:**
  - Backend API: http://localhost:3001
  - PostgreSQL: localhost:5432
  - Redis: localhost:6379

### Production Environment
- **File:** `docker/docker-compose.yml`
- **Features:**
  - Optimized for deployment
  - No volume mounts for security
  - Health checks and restart policies
  - Production logging configuration
- **Ports:**
  - Backend API: http://localhost:3001
  - Database and Redis are internal only

## Services

### Backend Service
- **Container:** `astro_backend_dev` / `astro_backend_prod`
- **Technology:** Node.js/TypeScript with Express
- **Features:**
  - Telegram Bot integration
  - REST API endpoints
  - Database connections (PostgreSQL)
  - Redis session management
  - Remote Ephemeris API integration

### Database Service
- **Container:** `astro_postgres_dev` / `astro_postgres_prod`
- **Technology:** PostgreSQL 15 Alpine
- **Features:**
  - Automatic schema initialization
  - Health checks
  - Persistent data volumes

### Cache Service
- **Container:** `astro_redis_dev` / `astro_redis_prod`
- **Technology:** Redis 7 Alpine
- **Features:**
  - Session storage
  - Caching for API responses
  - Health checks

## Directory Structure

```
docker/
├── docker-compose.yml          # Production environment
├── docker-compose.dev.yml      # Development environment
├── Dockerfile.backend          # Backend service image
├── init.sql                    # Database initialization
└── nginx.conf                  # Nginx configuration (future use)
```

## Environment Variables

All necessary environment variables are configured in the Docker Compose files:

```yaml
environment:
  - NODE_ENV=development  # or production
  - DATABASE_URL=postgresql://astro_user:astro_password@postgres:5432/adaptive_astro
  - REDIS_URL=redis://redis:6379
  - EPHEMERIS_API_URL=http://176.123.166.252:3000
  - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
```

## External Dependencies

### Remote Ephemeris API
- **URL:** http://176.123.166.252:3000
- **Purpose:** Astronomical calculations and ephemeris data
- **Why Remote:** Avoids complex Python/Swiss Ephemeris dependency builds in Docker

## Management Commands

### View Logs
```bash
# Development
docker-compose -f docker/docker-compose.dev.yml logs -f

# Production
docker-compose -f docker/docker-compose.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.dev.yml logs -f backend
```

### Stop Services
```bash
# Development
docker-compose -f docker/docker-compose.dev.yml down

# Production
docker-compose -f docker/docker-compose.yml down
```

### Restart Services
```bash
# Development
docker-compose -f docker/docker-compose.dev.yml restart

# Production
docker-compose -f docker/docker-compose.yml restart
```

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it astro_postgres_dev psql -U astro_user -d adaptive_astro

# Or using connection string
docker exec -it astro_postgres_dev psql postgresql://astro_user:astro_password@localhost:5432/adaptive_astro
```

### Redis Access
```bash
# Connect to Redis CLI
docker exec -it astro_redis_dev redis-cli
```

## Health Checks

All services include health checks that can be viewed with:
```bash
docker-compose -f docker/docker-compose.dev.yml ps
```

### API Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Adaptive Astro-Scheduler API",
  "version": "0.1.0",
  "timestamp": "2026-01-26T12:03:44.090Z"
}
```

## Troubleshooting

### Port Conflicts
If you get "port already in use" errors:
```bash
# Find what's using the port
lsof -i :3001  # or :5432, :6379

# Kill the process
kill <PID>

# Or stop existing Docker containers
docker stop $(docker ps -q)
```

### Container Issues
```bash
# Remove all containers and start fresh
docker-compose -f docker/docker-compose.dev.yml down -v
docker-compose -f docker/docker-compose.dev.yml up -d --build

# View container status
docker ps -a

# Check specific container logs
docker logs <container_name>
```

### Database Issues
```bash
# Reset database (WARNING: destroys data)
docker-compose -f docker/docker-compose.dev.yml down -v
docker volume rm docker_postgres_data_dev
docker-compose -f docker/docker-compose.dev.yml up -d
```

## Deployment

### Local Development
1. Run `./start-dev-docker.sh`
2. Make code changes in your IDE
3. Changes are automatically reflected (volume mounts)
4. Test via http://localhost:3001

### Server Deployment
1. Copy project files to server
2. Set TELEGRAM_BOT_TOKEN environment variable
3. Run `./start-prod-docker.sh`
4. Configure reverse proxy (nginx) if needed
5. Set up SSL certificates for production use

### Server Environment Variables
```bash
# On server, create .env file or export:
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
```

## Benefits of This Docker Setup

1. **Consistency:** Same environment locally and on server
2. **Isolation:** No conflicts with system packages
3. **Easy Setup:** One command starts everything
4. **Development Friendly:** Live code reloading with volume mounts
5. **Production Ready:** Optimized containers with health checks
6. **Database Management:** Automatic schema setup and migrations
7. **Dependency Resolution:** No more Python/C library build issues
8. **Scalability:** Easy to add more services or scale existing ones

This Docker setup eliminates the complexity of managing multiple services, database setup, and dependency conflicts while providing a professional deployment-ready solution.
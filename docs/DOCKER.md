# Docker Setup for AI Pets Adventure

This document provides comprehensive instructions for using Docker with the AI Pets Adventure project.

## 🐳 Overview

The project includes a multi-stage Docker setup with:
- **Development environment** with hot reloading
- **Production environment** with optimized builds
- **Testing environment** for CI/CD
- **Nginx reverse proxy** with SSL support
- **Redis** for caching and session storage
- **PostgreSQL** for game data persistence

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- Ports 3000, 80, 443, 6379, 5432 available

## 🚀 Quick Start

### 1. Development Environment

```bash
# Start development environment
docker-compose --profile dev up --build

# Access the app at http://localhost:3000
```

### 2. Production Environment

```bash
# Start production environment
docker-compose --profile prod up --build

# Access the app at https://localhost (with SSL)
```

### 3. Testing Environment

```bash
# Run tests in Docker
docker-compose --profile test up --build

# Or run tests directly
docker build --target test -t ai-pets-test .
docker run --rm ai-pets-test
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80/443)│    │  Next.js App   │    │     Redis      │
│   (Reverse Proxy)│◄──►│   (Port 3000)  │    │   (Port 6379)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Port 5432)   │
                       └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
POSTGRES_DB=ai_pets_adventure
POSTGRES_USER=aipets
POSTGRES_PASSWORD=aipets_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# SSL (for production)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### SSL Certificates

For production with HTTPS, place your SSL certificates in `nginx/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

## 📁 File Structure

```
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml        # Service orchestration
├── .dockerignore             # Docker build exclusions
├── nginx/
│   └── nginx.conf           # Nginx configuration
├── src/pages/api/
│   └── health.ts            # Health check endpoint
└── DOCKER.md                # This documentation
```

## 🛠️ Docker Commands

### Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build app-dev

# Build with no cache
docker-compose build --no-cache
```

### Run Services

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start specific profile
docker-compose --profile prod up -d

# View logs
docker-compose logs -f app-dev
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop app-dev
```

### Management

```bash
# View running containers
docker-compose ps

# Execute commands in container
docker-compose exec app-dev npm run test

# View resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

## 🔍 Monitoring & Debugging

### Health Checks

The application includes health check endpoints:
- **Docker Health Check**: Built into the container
- **API Health Check**: `/api/health`
- **Nginx Health Check**: `/health`

### Logs

```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f app-prod

# View logs with timestamps
docker-compose logs -t
```

### Performance

```bash
# Monitor container resources
docker stats

# Inspect container details
docker inspect <container_id>

# View container processes
docker top <container_id>
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Fix Docker permissions
sudo usermod -aG docker $USER
```

#### Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### Memory Issues
```bash
# Increase Docker memory limit
# In Docker Desktop: Settings > Resources > Memory

# Check container memory usage
docker stats
```

### Debug Mode

```bash
# Run with debug logging
docker-compose --profile dev up --build --verbose

# Access container shell
docker-compose exec app-dev sh

# View container environment
docker-compose exec app-dev env
```

## 🔒 Security

### Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for sensitive data
3. **Run containers as non-root** users
4. **Regularly update** base images
5. **Scan images** for vulnerabilities

### Security Scanning

```bash
# Scan for vulnerabilities
docker scan ai-pets-adventure:latest

# Use Trivy for detailed scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image ai-pets-adventure:latest
```

## 📊 Performance Optimization

### Build Optimization

- Multi-stage builds reduce final image size
- `.dockerignore` excludes unnecessary files
- Layer caching optimizes rebuilds
- Alpine Linux base images minimize size

### Runtime Optimization

- Nginx handles static file serving
- Gzip compression reduces bandwidth
- Redis caching improves response times
- Connection pooling for database

## 🚀 Deployment

### Production Deployment

```bash
# Build production image
docker build --target runner -t ai-pets-adventure:prod .

# Run with production environment
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --name ai-pets-prod \
  ai-pets-adventure:prod
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml ai-pets
```

### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Scale deployment
kubectl scale deployment ai-pets --replicas=3
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Redis Docker](https://hub.docker.com/_/redis)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)

## 🤝 Contributing

When contributing to the Docker setup:

1. Test changes in all environments
2. Update documentation
3. Follow security best practices
4. Maintain backward compatibility
5. Add appropriate health checks

## 📝 Changelog

- **v1.0.0**: Initial Docker setup with multi-stage builds
- **v1.1.0**: Added Nginx reverse proxy and SSL support
- **v1.2.0**: Integrated Redis and PostgreSQL services
- **v1.3.0**: Enhanced security and monitoring features 
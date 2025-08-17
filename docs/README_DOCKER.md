# AI Pets Adventure - Docker Implementation

This document provides comprehensive documentation for the Docker implementation of the AI Pets Adventure project.

## 🐳 Overview

The project includes a complete Docker setup with multiple environments (development, production, and testing) designed for scalability, security, and ease of deployment.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  Next.js App    │    │   PostgreSQL    │
│   (SSL/TLS)     │◄──►│   (Production)  │◄──►│   Database      │
│   Port 80/443   │    │   Port 3001     │    │   Port 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │   Redis Cache   │    │   SSL Certs     │
│   Environment   │    │   Port 6379     │    │   (Self-signed) │
│   Port 3000     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Docker Compose available
- Ports 3000, 3001, 80, 443, 5432, and 6379 available

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ai_pets_adventure
```

### 2. Generate SSL Certificates

```bash
chmod +x scripts/generate-ssl.sh
./scripts/generate-ssl.sh
```

### 3. Build Images

```bash
make build
```

### 4. Start Environment

Choose one of the following:

```bash
# Development (with hot reloading)
make dev

# Production (with Nginx and SSL)
make prod

# Testing (run Jest tests)
make test
```

## 🛠️ Available Commands

### Make Commands

| Command | Description |
|---------|-------------|
| `make build` | Build all Docker images |
| `make dev` | Start development environment |
| `make prod` | Start production environment |
| `make test` | Run tests in Docker |
| `make status` | Show service status |
| `make logs` | Show service logs |
| `make health` | Run health checks |
| `make clean` | Stop all services |
| `make shell` | Access container shell |
| `make demo` | Run comprehensive demo |

### Docker Compose Commands

```bash
# Start specific profile
docker-compose --profile dev up -d
docker-compose --profile prod up -d
docker-compose --profile test up

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

## 🌍 Environment Profiles

### Development Profile (`--profile dev`)

- **Port**: 3000
- **Features**: Hot reloading, volume mounting, development dependencies
- **Use Case**: Local development and debugging

```yaml
services:
  app-dev:
    build:
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### Production Profile (`--profile prod`)

- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Features**: Nginx reverse proxy, SSL/TLS, Redis, PostgreSQL
- **Use Case**: Production deployment

```yaml
services:
  app-prod:
    build:
      target: runner
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
  
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
```

### Testing Profile (`--profile test`)

- **Features**: Jest testing, isolated environment
- **Use Case**: CI/CD pipelines, automated testing

```yaml
services:
  app-test:
    build:
      target: test
    environment:
      - NODE_ENV=test
    command: npm test
```

## 🔐 SSL Configuration

### Self-Signed Certificates

The project includes a script to generate self-signed SSL certificates:

```bash
./scripts/generate-ssl.sh
```

This creates:
- `nginx/ssl/cert.pem` - SSL certificate
- `nginx/ssl/key.pem` - Private key

### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name localhost;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
}
```

## 🗄️ Database Services

### PostgreSQL

- **Port**: 5432
- **Version**: 15
- **Data Persistence**: Docker volumes
- **Environment Variables**:
  - `POSTGRES_DB`: ai_pets_adventure
  - `POSTGRES_USER`: postgres
  - `POSTGRES_PASSWORD`: password

### Redis

- **Port**: 6379
- **Version**: 7-alpine
- **Data Persistence**: Docker volumes
- **Use Case**: Caching, session storage

## 📁 Project Structure

```
ai_pets_adventure/
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Service orchestration
├── nginx/
│   ├── nginx.conf            # Nginx configuration
│   └── ssl/                  # SSL certificates
├── scripts/
│   ├── docker-demo.sh        # Comprehensive demo script
│   └── generate-ssl.sh       # SSL certificate generation
├── Makefile                  # Build automation
└── .dockerignore            # Docker build exclusions
```

## 🔧 Dockerfile Stages

### 1. Base Stage
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
```

### 2. Dependencies Stage
```dockerfile
FROM base AS deps
RUN npm ci --only=production
```

### 3. Development Stage
```dockerfile
FROM base AS dev
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
```

### 4. Testing Stage
```dockerfile
FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]
```

### 5. Production Stage
```dockerfile
FROM base AS runner
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 🚦 Health Checks

### Application Health

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

### Nginx Health

```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

## 📊 Monitoring and Logging

### Service Logs

```bash
# View all logs
make logs

# View specific service logs
docker-compose logs -f app-prod
docker-compose logs -f nginx
```

### Health Monitoring

```bash
# Run health checks
make health

# Check service status
make status
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Docker CI/CD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: make test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build images
        run: make build
```

## 🚨 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using a port
lsof -i :3000

# Stop conflicting services
make clean
```

#### SSL Certificate Issues
```bash
# Regenerate certificates
./scripts/generate-ssl.sh

# Restart Nginx
docker-compose restart nginx
```

#### Database Connection Issues
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres
```

### Debug Commands

```bash
# Access container shell
make shell

# View detailed logs
docker-compose logs --tail=100 -f

# Check container resources
docker stats
```

## 📈 Performance Optimization

### Nginx Caching

```nginx
# Static file caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Docker Optimization

```dockerfile
# Multi-stage builds reduce image size
# Alpine base images for smaller footprint
# Layer caching for faster builds
```

## 🔒 Security Considerations

### Container Security

- Non-root user execution
- Minimal base images (Alpine Linux)
- Regular security updates
- Resource limits

### Network Security

- Internal Docker networks
- Port exposure only where necessary
- SSL/TLS encryption in production

## 🌟 Advanced Features

### PWA Support

- Service worker registration
- Manifest file generation
- Offline functionality
- App-like experience

### Environment Variables

```bash
# Development
NODE_ENV=development
PORT=3000

# Production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@postgres:5432/db
REDIS_URL=redis://redis:6379
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

## 🤝 Contributing

When contributing to the Docker implementation:

1. Test all environments before submitting
2. Update documentation for new features
3. Ensure backward compatibility
4. Follow Docker best practices

## 📄 License

This Docker implementation is part of the AI Pets Adventure project and follows the same license terms.

---

**Happy Dockerizing! 🐳✨** 
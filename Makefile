# AI Pets Adventure - Docker Makefile
.PHONY: help build dev prod test clean logs shell health

# Default target
help:
	@echo "AI Pets Adventure - Docker Commands"
	@echo "=================================="
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-build    - Build and start development environment"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run tests in Docker"
	@echo "  make test-build   - Build and run tests"
	@echo "  make demo         - Run comprehensive Docker demo"
	@echo ""
	@echo "Management:"
	@echo "  make build        - Build all Docker images"
	@echo "  make logs         - View logs for all services"
	@echo "  make shell        - Access shell in development container"
	@echo "  make health       - Check health status"
	@echo "  make clean        - Stop and remove all containers/volumes"
	@echo "  make prune        - Clean up Docker system"
	@echo ""

# Build all images
build:
	docker-compose build

# Development environment
dev:
	docker-compose --profile dev up -d

dev-build:
	docker-compose --profile dev up --build -d

# Production environment
prod:
	docker-compose --profile prod up -d

prod-build:
	docker-compose --profile prod up --build -d

# Testing environment
test:
	docker-compose --profile test up --build

test-build:
	docker-compose --profile test up --build

# Demo all environments
demo:
	@echo "Running comprehensive Docker demo..."
	@./scripts/docker-demo.sh

# View logs
logs:
	docker-compose logs -f

# Access shell in development container
shell:
	docker-compose exec app-dev sh

# Check health status
health:
	@echo "Checking application health..."
	@curl -s http://localhost:3000/api/health | jq . || echo "Application not responding"
	@echo ""
	@echo "Checking Nginx health..."
	@curl -s http://localhost/health || echo "Nginx not responding"

# Stop and clean up
clean:
	docker-compose down -v
	docker-compose --profile prod down -v

# Clean up Docker system
prune:
	docker system prune -a -f
	docker volume prune -f
	docker network prune -f

# Install dependencies (for local development)
install:
	npm install

# Run tests locally
test-local:
	npm test

# Build application locally
build-local:
	npm run build

# Start application locally
start-local:
	npm run dev

# Docker image management
images:
	docker images | grep ai-pets

# Container status
status:
	docker-compose ps

# Restart services
restart:
	docker-compose restart

# Update images
update:
	docker-compose pull
	docker-compose build --no-cache

# Backup volumes
backup:
	@echo "Creating backup of volumes..."
	@mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	@docker run --rm -v ai_pets_adventure_redis-data:/data -v $(PWD)/backups/$(shell date +%Y%m%d_%H%M%S):/backup alpine tar czf /backup/redis-data.tar.gz -C /data .
	@docker run --rm -v ai_pets_adventure_postgres-data:/data -v $(PWD)/backups/$(shell date +%Y%m%d_%H%M%S):/backup alpine tar czf /backup/postgres-data.tar.gz -C /data .
	@echo "Backup completed in backups/$(shell date +%Y%m%d_%H%M%S)/"

# Performance monitoring
monitor:
	@echo "Container resource usage:"
	@docker stats --no-stream
	@echo ""
	@echo "Disk usage:"
	@docker system df
	@echo ""
	@echo "Network usage:"
	@docker network ls

# Security scan
security-scan:
	@echo "Scanning for vulnerabilities..."
	@docker scan ai-pets-adventure:latest || echo "Docker scan not available. Install Docker Scout or use Trivy."

# Quick development cycle
dev-cycle: dev-build logs

# Quick production cycle
prod-cycle: prod-build logs

# Quick test cycle
test-cycle: test-build 
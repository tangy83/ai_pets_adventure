# AI Pets Adventure - Docker Makefile
.PHONY: help build dev prod test clean logs shell health test-rewards test-performance

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
	@echo "  make test-rewards - Test Reward Calculator functionality"
	@echo "  make test-performance - Run performance benchmarks"
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
	docker-compose --profile prod up --build -d

prod-build:
	docker-compose --profile prod up --build -d

# Testing environment
test:
	docker-compose --profile test up --build

test-build:
	docker-compose --profile test up --build

# Test Reward Calculator functionality
test-rewards:
	@echo "🧪 Testing Reward Calculator functionality..."
	@echo "Starting development environment..."
	@make dev
	@echo "Waiting for services to start..."
	@sleep 10
	@echo "Testing Reward Calculator..."
	@curl -s http://localhost:3000/test-rewards | grep -q "Reward Calculator" && echo "✅ Test page accessible" || echo "❌ Test page not accessible"
	@echo ""
	@echo "🌐 Open http://localhost:3000/test-rewards in your browser"
	@echo "📊 Run the performance tests to see real metrics"

# Test Reward Calculator performance
test-performance:
	@echo "🚀 Testing Reward Calculator Performance..."
	@echo "Running performance benchmarks..."
	@node tests/test-rewards-performance.js
	@echo ""
	@echo "💡 For detailed memory analysis, run:"
	@echo "   node --expose-gc tests/test-rewards-performance.js"

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

# Test Reward Calculator locally
test-rewards-local:
	@echo "🧪 Testing Reward Calculator locally..."
	@echo "Starting local development server..."
	@npm run dev &
	@echo "Waiting for server to start..."
	@sleep 15
	@echo "Testing Reward Calculator..."
	@curl -s http://localhost:3000/test-rewards | grep -q "Reward Calculator" && echo "✅ Test page accessible" || echo "❌ Test page not accessible"
	@echo ""
	@echo "🌐 Open http://localhost:3000/test-rewards in your browser"
	@echo "📊 Run the performance tests to see real metrics"
	@echo ""
	@echo "Press Ctrl+C to stop the local server"

# Quick performance test
quick-performance:
	@echo "⚡ Quick Performance Test..."
	@node -e "
	const start = performance.now();
	for(let i = 0; i < 10000; i++) {
		const base = Math.random() * 1000;
		const multiplier = 1.0 + Math.random() * 2.0;
		const result = base * multiplier;
	}
	const end = performance.now();
	console.log(\`✅ 10,000 calculations: \${(end - start).toFixed(2)}ms\`);
	console.log(\`📈 Average: \${((end - start) / 10000).toFixed(3)}ms per calculation\`);
	" 
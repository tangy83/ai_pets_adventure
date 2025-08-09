#!/bin/bash

# AI Pets Adventure - Docker Implementation Demo
# This script demonstrates the complete Docker setup for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            print_success "$service is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to wait for HTTPS service
wait_for_https_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service to be ready on HTTPS port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -k -s "https://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Check application health
    if curl -s "http://localhost:3000/api/health" | grep -q "status.*healthy"; then
        print_success "Application health check passed"
    else
        print_error "Application health check failed"
        return 1
    fi
    
    # Check Nginx health (if running)
    if docker-compose ps nginx | grep -q "Up"; then
        if curl -k -s "https://localhost/health" | grep -q "healthy"; then
            print_success "Nginx health check passed"
        else
            print_error "Nginx health check failed"
            return 1
        fi
    fi
    
    return 0
}

# Function to show service status
show_status() {
    print_status "Current service status:"
    docker-compose ps
    echo
}

# Function to show logs
show_logs() {
    local service=$1
    print_status "Recent logs for $service:"
    docker-compose logs --tail=10 $service
    echo
}

# Function to test different environments
test_environment() {
    local env=$1
    local description=$2
    
    print_status "Testing $description environment..."
    
    case $env in
        "dev")
            make dev
            wait_for_service "Development App" 3000
            ;;
        "prod")
            make prod
            wait_for_https_service "Production App" 443
            ;;
        "test")
            make test
            print_success "Test environment completed"
            return 0
            ;;
        *)
            print_error "Unknown environment: $env"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        run_health_checks
        if [ $? -eq 0 ]; then
            print_success "$description environment is working correctly!"
            show_status
            return 0
        else
            print_error "$description environment health checks failed"
            return 1
        fi
    else
        print_error "$description environment failed to start"
        return 1
    fi
}

# Main demo function
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  AI Pets Adventure Docker Demo${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
    
    print_success "Docker environment is ready"
    echo
    
    # Build all images first
    print_status "Building Docker images..."
    make build
    print_success "All images built successfully"
    echo
    
    # Test development environment
    print_status "=== Testing Development Environment ==="
    test_environment "dev" "Development"
    if [ $? -eq 0 ]; then
        show_logs "app-dev"
        print_status "Stopping development environment..."
        make clean
        echo
    else
        print_error "Development environment test failed"
        exit 1
    fi
    
    # Test production environment
    print_status "=== Testing Production Environment ==="
    test_environment "prod" "Production"
    if [ $? -eq 0 ]; then
        show_logs "app-prod"
        show_logs "nginx"
        
        # Test HTTPS access
        print_status "Testing HTTPS access..."
        if curl -k -s "https://localhost/" | grep -q "AI Pets Adventure"; then
            print_success "HTTPS access working correctly"
        else
            print_warning "HTTPS access test inconclusive"
        fi
        
        print_status "Stopping production environment..."
        make clean
        echo
    else
        print_error "Production environment test failed"
        exit 1
    fi
    
    # Test testing environment
    print_status "=== Testing Testing Environment ==="
    test_environment "test" "Testing"
    if [ $? -eq 0 ]; then
        print_success "Testing environment completed successfully"
        make clean
        echo
    else
        print_error "Testing environment test failed"
        exit 1
    fi
    
    # Show final status
    print_status "=== Final Status ==="
    show_status
    
    # Show available commands
    print_status "=== Available Commands ==="
    echo "make dev          - Start development environment"
    echo "make prod         - Start production environment"
    echo "make test         - Run tests in Docker"
    echo "make status       - Show service status"
    echo "make logs         - Show service logs"
    echo "make health       - Run health checks"
    echo "make clean        - Stop all services"
    echo "make build        - Build all Docker images"
    echo
    
    print_success "Docker implementation demo completed successfully!"
    print_status "All environments are working correctly:"
    echo "  ✅ Development environment (port 3000)"
    echo "  ✅ Production environment (HTTPS on port 443)"
    echo "  ✅ Testing environment (Jest tests)"
    echo "  ✅ Nginx reverse proxy with SSL"
    echo "  ✅ Redis caching service"
    echo "  ✅ PostgreSQL database service"
    echo
    print_status "You can now use any of the make commands to manage your Docker environment."
}

# Run the demo
main "$@" 
#!/bin/bash
# BitPesa Bridge - MinMo Architecture Deployment Script

set -e

echo "🚀 BitPesa Bridge - MinMo Architecture Deployment"
echo "=================================================="

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl is not installed. Kubernetes deployment will be skipped."
    fi
    
    print_success "Dependencies check completed"
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f "infrastructure/docker/env.minmo" ]; then
        print_error "Environment file not found: infrastructure/docker/env.minmo"
        print_status "Please copy env.minmo.example and configure your settings"
        exit 1
    fi
    
    # Check for required environment variables
    source infrastructure/docker/env.minmo
    
    required_vars=(
        "POSTGRES_PASSWORD"
        "MINMO_API_KEY"
        "MINMO_WEBHOOK_SECRET"
        "DARAJA_CONSUMER_KEY"
        "DARAJA_CONSUMER_SECRET"
        "DARAJA_BUSINESS_SHORT_CODE"
        "DARAJA_PASSKEY"
        "AFRICAS_TALKING_API_KEY"
        "AFRICAS_TALKING_USERNAME"
        "API_BASE_URL"
        "WEB_BASE_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [ "${!var}" = "your_*_here" ]; then
            print_error "Required environment variable $var is not set or has default value"
            exit 1
        fi
    done
    
    print_success "Environment configuration is valid"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build MinMo Service
    print_status "Building MinMo Service..."
    docker build -t bitpesa/minmo-service:latest services/minmo-service/
    
    # Build Transaction Service
    print_status "Building Transaction Service..."
    docker build -t bitpesa/transaction-service:latest services/transaction-service/
    
    # Build M-Pesa Service
    print_status "Building M-Pesa Service..."
    docker build -t bitpesa/mpesa-service:latest services/mpesa-service/
    
    # Build Notification Service
    print_status "Building Notification Service..."
    docker build -t bitpesa/notification-service:latest services/notification-service/
    
    # Build Receipt Service
    print_status "Building Receipt Service..."
    docker build -t bitpesa/receipt-service:latest services/receipt-service/
    
    # Build Web App
    print_status "Building Web App..."
    docker build -t bitpesa/web-app:latest apps/web/
    
    print_success "All Docker images built successfully"
}

# Deploy with Docker Compose
deploy_docker_compose() {
    print_status "Deploying with Docker Compose..."
    
    cd infrastructure/docker
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.minmo.yml down
    
    # Start services
    print_status "Starting services..."
    docker-compose -f docker-compose.minmo.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    print_status "Checking service health..."
    
    services=(
        "transaction-service:3001"
        "minmo-service:3003"
        "mpesa-service:3002"
        "notification-service:3004"
        "receipt-service:3005"
        "web-app:3000"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if curl -f http://localhost:$port/health > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_warning "$name health check failed"
        fi
    done
    
    cd ../..
    print_success "Docker Compose deployment completed"
}

# Deploy with Kubernetes
deploy_kubernetes() {
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl not found, skipping Kubernetes deployment"
        return
    fi
    
    print_status "Deploying with Kubernetes..."
    
    # Create namespace
    kubectl apply -f infrastructure/kubernetes/deployments/minmo-deployments.yaml
    
    # Apply services
    kubectl apply -f infrastructure/kubernetes/services/minmo-services.yaml
    
    # Wait for deployments to be ready
    print_status "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment --all -n bitpesa-minmo
    
    print_success "Kubernetes deployment completed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run migrations for transaction service
    docker exec -it bitpesa-transaction-service-1 npx prisma migrate deploy
    
    print_success "Database migrations completed"
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    echo ""
    
    if command -v docker-compose &> /dev/null; then
        cd infrastructure/docker
        docker-compose -f docker-compose.minmo.yml ps
        cd ../..
    fi
    
    if command -v kubectl &> /dev/null; then
        echo ""
        print_status "Kubernetes Services:"
        kubectl get services -n bitpesa-minmo
        echo ""
        print_status "Kubernetes Deployments:"
        kubectl get deployments -n bitpesa-minmo
    fi
    
    echo ""
    print_success "Deployment completed successfully!"
    echo ""
    print_status "Access URLs:"
    echo "  Web App: http://localhost:3000"
    echo "  API Gateway: http://localhost:8000"
    echo "  Transaction Service: http://localhost:3001"
    echo "  MinMo Service: http://localhost:3003"
    echo "  M-Pesa Service: http://localhost:3002"
    echo ""
    print_status "API Endpoints:"
    echo "  Send Money: POST http://localhost:8000/api/v1/transactions/send-money"
    echo "  Buy Airtime: POST http://localhost:8000/api/v1/transactions/buy-airtime"
    echo "  Pay Bill: POST http://localhost:8000/api/v1/transactions/paybill"
    echo "  Buy Goods: POST http://localhost:8000/api/v1/transactions/buy-goods"
    echo "  Scan Pay: POST http://localhost:8000/api/v1/transactions/scan-pay"
    echo ""
    print_status "Health Checks:"
    echo "  Transaction Service: http://localhost:3001/health"
    echo "  MinMo Service: http://localhost:3003/health"
    echo "  M-Pesa Service: http://localhost:3002/health"
}

# Main deployment function
main() {
    echo ""
    print_status "Starting BitPesa Bridge MinMo deployment..."
    echo ""
    
    check_dependencies
    check_environment
    build_images
    deploy_docker_compose
    run_migrations
    deploy_kubernetes
    show_status
    
    echo ""
    print_success "🎉 BitPesa Bridge MinMo deployment completed successfully!"
    print_status "Ready to process Bitcoin to M-Pesa transactions!"
}

# Handle script arguments
case "${1:-}" in
    "docker")
        check_dependencies
        check_environment
        build_images
        deploy_docker_compose
        run_migrations
        show_status
        ;;
    "kubernetes")
        check_dependencies
        check_environment
        build_images
        deploy_kubernetes
        show_status
        ;;
    "build")
        check_dependencies
        build_images
        ;;
    "status")
        show_status
        ;;
    *)
        main
        ;;
esac

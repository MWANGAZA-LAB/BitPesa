#!/bin/bash

# BitPesa Bridge Production Deployment Script
# This script deploys the BitPesa Bridge platform to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="bitpesa"
REGISTRY="your-registry.com/bitpesa"
VERSION="latest"
ENVIRONMENT="production"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_warning "Helm is not installed. Some features may not be available."
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    # Build shared packages first
    log_info "Building shared packages..."
    docker build -t ${REGISTRY}/shared-types:${VERSION} -f packages/shared-types/Dockerfile packages/shared-types/
    docker build -t ${REGISTRY}/shared-utils:${VERSION} -f packages/shared-utils/Dockerfile packages/shared-utils/
    docker build -t ${REGISTRY}/shared-config:${VERSION} -f packages/shared-config/Dockerfile packages/shared-config/
    
    # Build services
    log_info "Building services..."
    docker build -t ${REGISTRY}/auth-service:${VERSION} -f services/auth-service/Dockerfile services/auth-service/
    docker build -t ${REGISTRY}/compliance-service:${VERSION} -f services/compliance-service/Dockerfile services/compliance-service/
    docker build -t ${REGISTRY}/monitoring-service:${VERSION} -f services/monitoring-service/Dockerfile services/monitoring-service/
    
    # Build web app
    log_info "Building web application..."
    docker build -t ${REGISTRY}/web:${VERSION} -f apps/web/Dockerfile apps/web/
    
    log_success "Docker images built successfully"
}

# Push images to registry
push_images() {
    log_info "Pushing images to registry..."
    
    # Push shared packages
    docker push ${REGISTRY}/shared-types:${VERSION}
    docker push ${REGISTRY}/shared-utils:${VERSION}
    docker push ${REGISTRY}/shared-config:${VERSION}
    
    # Push services
    docker push ${REGISTRY}/auth-service:${VERSION}
    docker push ${REGISTRY}/compliance-service:${VERSION}
    docker push ${REGISTRY}/monitoring-service:${VERSION}
    
    # Push web app
    docker push ${REGISTRY}/web:${VERSION}
    
    log_success "Images pushed to registry successfully"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Create namespace
    kubectl apply -f infrastructure/kubernetes/namespace.yaml
    
    # Apply configurations
    kubectl apply -f infrastructure/kubernetes/configmap.yaml
    kubectl apply -f infrastructure/kubernetes/secrets.yaml
    
    # Deploy services
    kubectl apply -f infrastructure/kubernetes/auth-service-deployment.yaml
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/auth-service -n ${NAMESPACE}
    
    log_success "Kubernetes deployment completed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Run Prisma migrations for each service
    kubectl run migration-job --image=${REGISTRY}/auth-service:${VERSION} --rm -i --restart=Never -n ${NAMESPACE} -- npx prisma migrate deploy
    
    log_success "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Deploy Prometheus
    if command -v helm &> /dev/null; then
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        helm install prometheus prometheus-community/kube-prometheus-stack -n ${NAMESPACE} --create-namespace
    else
        log_warning "Helm not available. Please install Prometheus manually."
    fi
    
    log_success "Monitoring setup completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    kubectl get pods -n ${NAMESPACE}
    
    # Check service status
    kubectl get services -n ${NAMESPACE}
    
    # Check ingress status
    kubectl get ingress -n ${NAMESPACE} 2>/dev/null || log_warning "No ingress found"
    
    log_success "Deployment verification completed"
}

# Main deployment function
main() {
    log_info "Starting BitPesa Bridge production deployment..."
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Registry: ${REGISTRY}"
    log_info "Version: ${VERSION}"
    
    check_prerequisites
    build_images
    push_images
    deploy_kubernetes
    run_migrations
    setup_monitoring
    verify_deployment
    
    log_success "BitPesa Bridge production deployment completed successfully!"
    log_info "You can now access the application at: https://bitpesa.com"
}

# Run main function
main "$@"

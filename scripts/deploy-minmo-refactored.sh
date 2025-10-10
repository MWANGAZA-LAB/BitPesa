#!/bin/bash
# BitPesa Bridge - MinMo Architecture Deployment Script
# Refactored for better maintainability and error handling

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly LOG_FILE="${PROJECT_ROOT}/deployment.log"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration constants
readonly REQUIRED_TOOLS=("docker" "docker-compose")
readonly OPTIONAL_TOOLS=("kubectl" "helm")
readonly ENV_FILE="${PROJECT_ROOT}/infrastructure/docker/env.minmo"
readonly DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/infrastructure/docker/docker-compose.minmo.yml"
readonly K8S_DEPLOYMENTS="${PROJECT_ROOT}/infrastructure/kubernetes/deployments/minmo-deployments.yaml"
readonly K8S_SERVICES="${PROJECT_ROOT}/infrastructure/kubernetes/services/minmo-services.yaml"

# Service configuration
declare -A SERVICE_PORTS=(
  ["transaction-service"]="3001"
  ["minmo-service"]="3003"
  ["mpesa-service"]="3002"
  ["notification-service"]="3004"
  ["receipt-service"]="3005"
  ["web-app"]="3000"
)

declare -A SERVICE_IMAGES=(
  ["transaction-service"]="bitpesa/transaction-service:latest"
  ["minmo-service"]="bitpesa/minmo-service:latest"
  ["mpesa-service"]="bitpesa/mpesa-service:latest"
  ["notification-service"]="bitpesa/notification-service:latest"
  ["receipt-service"]="bitpesa/receipt-service:latest"
  ["web-app"]="bitpesa/web-app:latest"
)

# Required environment variables
readonly REQUIRED_ENV_VARS=(
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

# Logging functions
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  case "$level" in
    "INFO")  echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
    "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE" ;;
    "WARNING") echo -e "${YELLOW}[WARNING]${NC} $message" | tee -a "$LOG_FILE" ;;
    "ERROR") echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
    "DEBUG") echo -e "${PURPLE}[DEBUG]${NC} $message" | tee -a "$LOG_FILE" ;;
  esac
  
  echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_success() { log "SUCCESS" "$@"; }
log_warning() { log "WARNING" "$@"; }
log_error() { log "ERROR" "$@"; }
log_debug() { log "DEBUG" "$@"; }

# Error handling
error_exit() {
  local exit_code="${1:-1}"
  local message="${2:-Unknown error occurred}"
  log_error "$message"
  exit "$exit_code"
}

# Utility functions
check_command_exists() {
  local cmd="$1"
  if ! command -v "$cmd" &> /dev/null; then
    return 1
  fi
  return 0
}

validate_file_exists() {
  local file_path="$1"
  local description="${2:-File}"
  
  if [[ ! -f "$file_path" ]]; then
    error_exit 1 "$description not found: $file_path"
  fi
}

validate_directory_exists() {
  local dir_path="$1"
  local description="${2:-Directory}"
  
  if [[ ! -d "$dir_path" ]]; then
    error_exit 1 "$description not found: $dir_path"
  fi
}

# Dependency checking
check_dependencies() {
  log_info "Checking dependencies..."
  
  local missing_tools=()
  
  # Check required tools
  for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! check_command_exists "$tool"; then
      missing_tools+=("$tool")
    else
      log_debug "Found required tool: $tool"
    fi
  done
  
  # Check optional tools
  for tool in "${OPTIONAL_TOOLS[@]}"; do
    if check_command_exists "$tool"; then
      log_debug "Found optional tool: $tool"
    else
      log_warning "Optional tool not found: $tool"
    fi
  done
  
  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    error_exit 1 "Missing required tools: ${missing_tools[*]}. Please install them first."
  fi
  
  log_success "Dependencies check completed"
}

# Environment validation
check_environment() {
  log_info "Checking environment configuration..."
  
  validate_file_exists "$ENV_FILE" "Environment file"
  
  # Source environment variables
  set -a  # Automatically export all variables
  source "$ENV_FILE"
  set +a
  
  local missing_vars=()
  local invalid_vars=()
  
  # Check required environment variables
  for var in "${REQUIRED_ENV_VARS[@]}"; do
    local value="${!var:-}"
    
    if [[ -z "$value" ]]; then
      missing_vars+=("$var")
    elif [[ "$value" == "your_${var,,}_here" ]]; then
      invalid_vars+=("$var")
    else
      log_debug "Environment variable $var is set"
    fi
  done
  
  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    error_exit 1 "Missing required environment variables: ${missing_vars[*]}"
  fi
  
  if [[ ${#invalid_vars[@]} -gt 0 ]]; then
    error_exit 1 "Environment variables with default values: ${invalid_vars[*]}"
  fi
  
  log_success "Environment configuration is valid"
}

# Docker operations
build_docker_images() {
  log_info "Building Docker images..."
  
  local build_errors=()
  
  for service in "${!SERVICE_IMAGES[@]}"; do
    local image="${SERVICE_IMAGES[$service]}"
    local service_dir="${PROJECT_ROOT}/services/${service}"
    
    if [[ ! -d "$service_dir" ]]; then
      log_warning "Service directory not found: $service_dir, skipping build"
      continue
    fi
    
    log_info "Building $service..."
    
    if docker build -t "$image" "$service_dir" 2>&1 | tee -a "$LOG_FILE"; then
      log_success "$service built successfully"
    else
      build_errors+=("$service")
      log_error "Failed to build $service"
    fi
  done
  
  if [[ ${#build_errors[@]} -gt 0 ]]; then
    error_exit 1 "Failed to build services: ${build_errors[*]}"
  fi
  
  log_success "All Docker images built successfully"
}

# Docker Compose operations
deploy_docker_compose() {
  log_info "Deploying with Docker Compose..."
  
  validate_file_exists "$DOCKER_COMPOSE_FILE" "Docker Compose file"
  
  cd "${PROJECT_ROOT}/infrastructure/docker"
  
  # Stop existing containers gracefully
  log_info "Stopping existing containers..."
  if docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" down --remove-orphans 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Existing containers stopped"
  else
    log_warning "Some containers may not have stopped cleanly"
  fi
  
  # Start services
  log_info "Starting services..."
  if docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" up -d 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Services started successfully"
  else
    error_exit 1 "Failed to start services with Docker Compose"
  fi
  
  # Wait for services to be ready
  wait_for_services_ready
  
  cd "$PROJECT_ROOT"
  log_success "Docker Compose deployment completed"
}

# Service health checking
wait_for_services_ready() {
  log_info "Waiting for services to be ready..."
  
  local max_wait_time=300  # 5 minutes
  local check_interval=10  # 10 seconds
  local elapsed_time=0
  
  while [[ $elapsed_time -lt $max_wait_time ]]; do
    local all_healthy=true
    
    for service in "${!SERVICE_PORTS[@]}"; do
      local port="${SERVICE_PORTS[$service]}"
      
      if ! check_service_health "localhost" "$port"; then
        all_healthy=false
        break
      fi
    done
    
    if [[ "$all_healthy" == true ]]; then
      log_success "All services are healthy"
      return 0
    fi
    
    log_info "Services not ready yet, waiting ${check_interval}s... (${elapsed_time}s elapsed)"
    sleep "$check_interval"
    elapsed_time=$((elapsed_time + check_interval))
  done
  
  log_warning "Services did not become ready within ${max_wait_time}s"
  show_service_status
}

check_service_health() {
  local host="$1"
  local port="$2"
  local timeout=5
  
  if curl -f -s --max-time "$timeout" "http://${host}:${port}/health" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

show_service_status() {
  log_info "Service Status:"
  
  for service in "${!SERVICE_PORTS[@]}"; do
    local port="${SERVICE_PORTS[$service]}"
    
    if check_service_health "localhost" "$port"; then
      log_success "$service is healthy (port $port)"
    else
      log_error "$service is unhealthy (port $port)"
    fi
  done
}

# Kubernetes operations
deploy_kubernetes() {
  if ! check_command_exists "kubectl"; then
    log_warning "kubectl not found, skipping Kubernetes deployment"
    return 0
  fi
  
  log_info "Deploying with Kubernetes..."
  
  validate_file_exists "$K8S_DEPLOYMENTS" "Kubernetes deployments file"
  validate_file_exists "$K8S_SERVICES" "Kubernetes services file"
  
  # Apply deployments
  log_info "Applying Kubernetes deployments..."
  if kubectl apply -f "$K8S_DEPLOYMENTS" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Kubernetes deployments applied"
  else
    error_exit 1 "Failed to apply Kubernetes deployments"
  fi
  
  # Apply services
  log_info "Applying Kubernetes services..."
  if kubectl apply -f "$K8S_SERVICES" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Kubernetes services applied"
  else
    error_exit 1 "Failed to apply Kubernetes services"
  fi
  
  # Wait for deployments to be ready
  log_info "Waiting for deployments to be ready..."
  if kubectl wait --for=condition=available --timeout=300s deployment --all -n bitpesa-minmo 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Kubernetes deployments are ready"
  else
    log_warning "Some Kubernetes deployments may not be ready"
  fi
  
  log_success "Kubernetes deployment completed"
}

# Database operations
run_database_migrations() {
  log_info "Running database migrations..."
  
  # Wait for database to be ready
  sleep 10
  
  # Find the transaction service container
  local container_name=$(docker ps --format "table {{.Names}}" | grep "transaction-service" | head -1)
  
  if [[ -z "$container_name" ]]; then
    log_warning "Transaction service container not found, skipping migrations"
    return 0
  fi
  
  log_info "Running migrations in container: $container_name"
  
  if docker exec "$container_name" npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Database migrations completed"
  else
    log_error "Database migrations failed"
    return 1
  fi
}

# Status reporting
show_deployment_status() {
  log_info "Deployment Status:"
  echo ""
  
  # Docker Compose status
  if check_command_exists "docker-compose"; then
    cd "${PROJECT_ROOT}/infrastructure/docker"
    docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" ps
    cd "$PROJECT_ROOT"
  fi
  
  # Kubernetes status
  if check_command_exists "kubectl"; then
    echo ""
    log_info "Kubernetes Services:"
    kubectl get services -n bitpesa-minmo 2>/dev/null || log_warning "Could not get Kubernetes services"
    
    echo ""
    log_info "Kubernetes Deployments:"
    kubectl get deployments -n bitpesa-minmo 2>/dev/null || log_warning "Could not get Kubernetes deployments"
  fi
  
  echo ""
  log_success "Deployment completed successfully!"
  echo ""
  show_access_urls
}

show_access_urls() {
  log_info "Access URLs:"
  echo "  Web App: http://localhost:3000"
  echo "  API Gateway: http://localhost:8000"
  echo "  Transaction Service: http://localhost:3001"
  echo "  MinMo Service: http://localhost:3003"
  echo "  M-Pesa Service: http://localhost:3002"
  echo ""
  log_info "API Endpoints:"
  echo "  Send Money: POST http://localhost:8000/api/v1/transactions/send-money"
  echo "  Buy Airtime: POST http://localhost:8000/api/v1/transactions/buy-airtime"
  echo "  Pay Bill: POST http://localhost:8000/api/v1/transactions/paybill"
  echo "  Buy Goods: POST http://localhost:8000/api/v1/transactions/buy-goods"
  echo "  Scan Pay: POST http://localhost:8000/api/v1/transactions/scan-pay"
  echo ""
  log_info "Health Checks:"
  for service in "${!SERVICE_PORTS[@]}"; do
    local port="${SERVICE_PORTS[$service]}"
    echo "  $service: http://localhost:$port/health"
  done
}

# Cleanup operations
cleanup() {
  log_info "Cleaning up..."
  
  cd "${PROJECT_ROOT}/infrastructure/docker"
  
  if docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" down --volumes --remove-orphans 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Cleanup completed"
  else
    log_warning "Some cleanup operations may have failed"
  fi
  
  cd "$PROJECT_ROOT"
}

# Main deployment function
main() {
  log_info "Starting BitPesa Bridge MinMo deployment..."
  log_info "Log file: $LOG_FILE"
  echo ""
  
  check_dependencies
  check_environment
  build_docker_images
  deploy_docker_compose
  run_database_migrations
  deploy_kubernetes
  show_deployment_status
  
  echo ""
  log_success "🎉 BitPesa Bridge MinMo deployment completed successfully!"
  log_info "Ready to process Bitcoin to M-Pesa transactions!"
}

# Command line argument handling
case "${1:-}" in
  "docker")
    log_info "Running Docker-only deployment..."
    check_dependencies
    check_environment
    build_docker_images
    deploy_docker_compose
    run_database_migrations
    show_deployment_status
    ;;
  "kubernetes")
    log_info "Running Kubernetes-only deployment..."
    check_dependencies
    check_environment
    build_docker_images
    deploy_kubernetes
    show_deployment_status
    ;;
  "build")
    log_info "Building Docker images only..."
    check_dependencies
    build_docker_images
    ;;
  "status")
    show_deployment_status
    ;;
  "cleanup")
    cleanup
    ;;
  "help"|"-h"|"--help")
    echo "Usage: $SCRIPT_NAME [command]"
    echo ""
    echo "Commands:"
    echo "  docker      Deploy using Docker Compose only"
    echo "  kubernetes  Deploy using Kubernetes only"
    echo "  build       Build Docker images only"
    echo "  status      Show deployment status"
    echo "  cleanup     Clean up all containers and volumes"
    echo "  help        Show this help message"
    echo ""
    echo "Default: Full deployment (Docker Compose + Kubernetes)"
    ;;
  *)
    main
    ;;
esac

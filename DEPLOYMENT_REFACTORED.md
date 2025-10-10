# BitPesa Bridge - Refactored Deployment Guide

## 🚀 **Quick Start with Refactored System**

This guide covers deploying the refactored BitPesa Bridge system with enhanced error handling, monitoring, and configuration management.

## 📋 **Prerequisites**

- Docker & Docker Compose
- Node.js 20+ and pnpm 8+
- MinMo API credentials
- Safaricom Daraja API credentials
- Africa's Talking SMS credentials

## 🔧 **Environment Setup**

### 1. **Configure Environment Variables**

```bash
# Copy the comprehensive environment template
cp infrastructure/docker/env.template infrastructure/docker/.env.minmo

# Edit with your actual credentials
nano infrastructure/docker/.env.minmo
```

**Required Variables:**
```bash
# MinMo API Configuration
MINMO_API_URL=https://api.minmo.com
MINMO_API_KEY=your_minmo_api_key_here
MINMO_WEBHOOK_SECRET=your_minmo_webhook_secret_here

# Safaricom Daraja API Configuration
DARAJA_CONSUMER_KEY=your_daraja_consumer_key_here
DARAJA_CONSUMER_SECRET=your_daraja_consumer_secret_here
DARAJA_BUSINESS_SHORT_CODE=your_business_short_code_here
DARAJA_PASSKEY=your_daraja_passkey_here
DARAJA_CALLBACK_URL=https://your-domain.com/api/v1/mpesa/callbacks

# Africa's Talking Configuration
AFRICAS_TALKING_API_KEY=your_africas_talking_api_key_here
AFRICAS_TALKING_USERNAME=your_africas_talking_username_here

# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bitpesa
POSTGRES_PASSWORD=your_postgres_password_here

# Application URLs
API_BASE_URL=https://api.your-domain.com
WEB_BASE_URL=https://app.your-domain.com
```

### 2. **Install Dependencies**

```bash
# Install dependencies for all packages
pnpm install

# Build shared packages first
pnpm --filter @bitpesa/shared-config build
pnpm --filter @bitpesa/shared-utils build
pnpm --filter @bitpesa/shared-types build
```

## 🐳 **Docker Deployment**

### **Option 1: Automated Deployment Script**

```bash
# Use the refactored deployment script
./scripts/deploy-minmo-refactored.sh

# Or deploy specific components
./scripts/deploy-minmo-refactored.sh docker    # Docker Compose only
./scripts/deploy-minmo-refactored.sh kubernetes # Kubernetes only
./scripts/deploy-minmo-refactored.sh build     # Build images only
./scripts/deploy-minmo-refactored.sh status    # Check status
```

### **Option 2: Manual Docker Compose**

```bash
cd infrastructure/docker
docker-compose -f docker-compose.minmo.yml up -d
```

## ☸️ **Kubernetes Deployment**

### 1. **Apply Kubernetes Manifests**

```bash
# Create namespace
kubectl create namespace bitpesa-minmo

# Apply deployments
kubectl apply -f infrastructure/kubernetes/deployments/minmo-deployments.yaml

# Apply services
kubectl apply -f infrastructure/kubernetes/services/minmo-services.yaml

# Check deployment status
kubectl get pods -n bitpesa-minmo
kubectl get services -n bitpesa-minmo
```

### 2. **Verify Deployment**

```bash
# Check pod status
kubectl get pods -n bitpesa-minmo

# Check service endpoints
kubectl get endpoints -n bitpesa-minmo

# View logs
kubectl logs -f deployment/transaction-service -n bitpesa-minmo
```

## 🔍 **Health Checks and Monitoring**

### **Service Health Endpoints**

```bash
# Check individual service health
curl http://localhost:3001/health  # Transaction Service
curl http://localhost:3002/health  # M-Pesa Service
curl http://localhost:3003/health  # MinMo Service
curl http://localhost:3004/health  # Notification Service
curl http://localhost:3005/health  # Receipt Service
curl http://localhost:3000/health  # Web App
```

### **System Monitoring**

```bash
# Get overall system health
curl http://localhost:8000/monitoring/health

# Get service-specific metrics
curl http://localhost:8000/monitoring/metrics/transaction-service

# Get Prometheus metrics
curl http://localhost:8000/monitoring/metrics/prometheus

# Get current alerts
curl http://localhost:8000/monitoring/alerts
```

## 🧪 **Testing the Refactored System**

### **Unit Tests**

```bash
# Run tests for shared-config package
cd packages/shared-config
pnpm test

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch
```

### **Integration Tests**

```bash
# Run integration tests
pnpm test:integration

# Run performance tests
pnpm test:performance
```

### **API Testing**

```bash
# Test transaction creation
curl -X POST http://localhost:8000/api/v1/transactions/send-money \
  -H "Content-Type: application/json" \
  -d '{
    "recipientPhone": "254712345678",
    "recipientName": "John Doe",
    "kesAmount": 1000,
    "ipAddress": "192.168.1.1"
  }'

# Test health check
curl http://localhost:8000/health
```

## 📊 **Monitoring and Observability**

### **Metrics Collection**

The refactored system includes comprehensive metrics collection:

- **Request Metrics**: Total, successful, failed requests
- **Response Time**: Average, P95, P99 percentiles
- **Error Tracking**: Error types and frequencies
- **Circuit Breaker States**: Open, closed, half-open counts
- **Retry Statistics**: Total retries, success/failure rates

### **Alert Rules**

Pre-configured alert rules include:

- **High Error Rate**: >10% error rate
- **High Response Time**: >5 seconds average
- **Circuit Breaker Open**: Critical alert
- **High Retry Rate**: >20% retry rate

### **Prometheus Integration**

```bash
# Scrape metrics from Prometheus
curl http://localhost:8000/monitoring/metrics/prometheus

# Example Prometheus configuration
scrape_configs:
  - job_name: 'bitpesa-services'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/monitoring/metrics/prometheus'
    scrape_interval: 30s
```

## 🔧 **Configuration Management**

### **Environment-Specific Configuration**

The refactored system supports environment-specific configurations:

```typescript
// Access configuration in services
constructor(private readonly appConfig: AppConfigService) {}

// Get database configuration
const dbConfig = this.appConfig.getDatabaseConfig();

// Get API configuration
const apiConfig = this.appConfig.getApiConfig();

// Check environment
if (this.appConfig.isProduction()) {
  // Production-specific logic
}
```

### **Configuration Validation**

All environment variables are validated at startup:

```bash
# Missing required variables will cause startup failure
Error: Required environment variable MINMO_API_KEY is not set or has default value
```

## 🚨 **Error Handling and Resilience**

### **Retry Logic**

The system includes automatic retry with exponential backoff:

```typescript
// Automatic retry for external service calls
const result = await this.retryService.executeWithRetry(
  () => this.externalService.call(),
  {
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryCondition: (error) => this.errorHandler.isRetryableError(error)
  }
);
```

### **Circuit Breaker Pattern**

Circuit breakers prevent cascading failures:

```typescript
// Circuit breaker for external services
const result = await this.retryService.executeWithCircuitBreaker(
  () => this.externalService.call(),
  'external-service',
  {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000
  }
);
```

### **Error Tracking**

All errors are tracked and categorized:

```bash
# View error metrics
curl http://localhost:8000/monitoring/metrics/transaction-service | jq '.metrics.errors'
```

## 🔄 **Deployment Strategies**

### **Blue-Green Deployment**

```bash
# Deploy to staging first
./scripts/deploy-minmo-refactored.sh docker

# Test staging environment
curl http://localhost:3001/health

# Deploy to production
kubectl apply -f infrastructure/kubernetes/production/
```

### **Rolling Updates**

```bash
# Update service image
kubectl set image deployment/transaction-service \
  transaction-service=bitpesa/transaction-service:v2.0.0 \
  -n bitpesa-minmo

# Monitor rollout
kubectl rollout status deployment/transaction-service -n bitpesa-minmo
```

## 📈 **Performance Optimization**

### **Resource Limits**

Kubernetes resource limits are configured:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### **Scaling**

```bash
# Scale services horizontally
kubectl scale deployment transaction-service --replicas=3 -n bitpesa-minmo

# Auto-scaling based on CPU
kubectl autoscale deployment transaction-service --min=2 --max=10 --cpu-percent=70 -n bitpesa-minmo
```

## 🔒 **Security Considerations**

### **Environment Variables**

- Never commit `.env` files to version control
- Use secrets management in production
- Rotate API keys regularly

### **Network Security**

```bash
# Restrict network access
kubectl create networkpolicy bitpesa-network-policy \
  --from=namespace=bitpesa-minmo \
  --to=namespace=bitpesa-minmo
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Service Health Check Failures**
   ```bash
   # Check service logs
   kubectl logs deployment/transaction-service -n bitpesa-minmo
   
   # Check service status
   kubectl describe service transaction-service -n bitpesa-minmo
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   kubectl exec -it deployment/transaction-service -n bitpesa-minmo -- \
     npx prisma db pull
   ```

3. **External Service Failures**
   ```bash
   # Check circuit breaker status
   curl http://localhost:8000/monitoring/metrics/transaction-service | jq '.metrics.circuitBreakers'
   ```

### **Debug Mode**

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Restart services
kubectl rollout restart deployment/transaction-service -n bitpesa-minmo
```

## 📚 **API Documentation**

### **Swagger Documentation**

```bash
# Access API documentation
open http://localhost:8000/api/docs
```

### **Health Check API**

```bash
# System health
GET /monitoring/health

# Service health
GET /monitoring/health/{service}

# Metrics
GET /monitoring/metrics/{service}

# Prometheus metrics
GET /monitoring/metrics/prometheus
```

## 🎯 **Next Steps**

1. **Set up monitoring dashboards** (Grafana, Prometheus)
2. **Configure log aggregation** (ELK Stack)
3. **Implement backup strategies** for database
4. **Set up alerting** (Slack, email notifications)
5. **Performance testing** and optimization
6. **Security auditing** and penetration testing

## 📞 **Support**

For issues with the refactored system:

1. Check the monitoring dashboard: `http://localhost:8000/monitoring/health`
2. Review service logs: `kubectl logs -f deployment/{service-name} -n bitpesa-minmo`
3. Check alert history: `curl http://localhost:8000/monitoring/alerts/history`
4. Verify configuration: `curl http://localhost:8000/monitoring/metrics`

The refactored BitPesa Bridge system is now production-ready with comprehensive monitoring, error handling, and configuration management! 🚀

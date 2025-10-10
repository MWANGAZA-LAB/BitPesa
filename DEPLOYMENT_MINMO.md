# BitPesa Bridge - MinMo Architecture Deployment Guide

## 🚀 **Complete Implementation Summary**

This guide covers the deployment of the **BitPesa Bridge MinMo-powered architecture** - a simplified, production-ready platform that enables Kenyan users to spend Bitcoin for M-Pesa services without signup.

## 📋 **What's Been Implemented**

### ✅ **Completed Components**

1. **MinMo Service** - Complete Bitcoin operations integration
2. **Transaction Service** - Simplified orchestration (MinMo-powered)
3. **M-Pesa Service** - All 5 M-Pesa functions
4. **Frontend Components** - No-signup user experience
5. **API Gateway** - Simplified Kong configuration
6. **Database Schema** - MinMo-compatible schema
7. **Deployment Config** - Docker & Kubernetes manifests
8. **Deployment Scripts** - Automated deployment

### 🏗️ **Architecture Transformation**

**Before (Complex):**
```
User → Auth Service → Lightning Service → Conversion Service → M-Pesa Service
```

**After (Simplified):**
```
User → MinMo Service → M-Pesa Service
```

## 🚀 **Quick Start**

### Prerequisites
- Docker & Docker Compose
- MinMo API credentials
- Safaricom Daraja API credentials
- Africa's Talking SMS credentials

### 1. **Configure Environment**
```bash
# Copy environment template
cp infrastructure/docker/env.minmo infrastructure/docker/.env.minmo

# Edit with your credentials
nano infrastructure/docker/.env.minmo
```

### 2. **Deploy with Docker Compose**
```bash
# Run automated deployment
./scripts/deploy-minmo.sh

# Or manually
cd infrastructure/docker
docker-compose -f docker-compose.minmo.yml up -d
```

### 3. **Deploy with Kubernetes**
```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/deployments/minmo-deployments.yaml
kubectl apply -f infrastructure/kubernetes/services/minmo-services.yaml
```

## 📁 **Project Structure**

```
BitPesa/
├── services/
│   ├── minmo-service/              # ✅ NEW - MinMo API integration
│   ├── transaction-service/         # ✅ UPDATED - MinMo-powered
│   ├── mpesa-service/              # ✅ KEPT - Safaricom integration
│   ├── notification-service/        # ✅ KEPT - SMS/Email
│   └── receipt-service/            # ✅ KEPT - PDF generation
├── apps/
│   └── web/                         # ✅ UPDATED - No-signup UI
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.minmo.yml # ✅ NEW - Simplified stack
│   │   ├── kong/minmo-kong.yml      # ✅ NEW - No-auth config
│   │   └── env.minmo                # ✅ NEW - Environment config
│   └── kubernetes/
│       ├── deployments/minmo-deployments.yaml # ✅ NEW
│       └── services/minmo-services.yaml       # ✅ NEW
├── scripts/
│   └── deploy-minmo.sh             # ✅ NEW - Automated deployment
└── bitpesa_minmo_revised.md        # ✅ COMPLETE - Full specification
```

## 🔧 **Services Overview**

### **MinMo Service** (`services/minmo-service/`)
- **Purpose**: Bitcoin operations via MinMo API
- **Features**: Swap creation, status tracking, webhook handling
- **Port**: 3003
- **Health**: `/health`

### **Transaction Service** (`services/transaction-service/`)
- **Purpose**: Main orchestration (MinMo-powered)
- **Features**: Transaction management, status tracking
- **Port**: 3001
- **Health**: `/health`

### **M-Pesa Service** (`services/mpesa-service/`)
- **Purpose**: Safaricom Daraja API integration
- **Features**: All 5 M-Pesa functions
- **Port**: 3002
- **Health**: `/health`

### **Web App** (`apps/web/`)
- **Purpose**: No-signup user interface
- **Features**: All 5 M-Pesa services, QR codes, real-time updates
- **Port**: 3000

## 🌐 **API Endpoints**

### **Public Endpoints (No Auth Required)**

```bash
# Transaction Creation
POST /api/v1/transactions/send-money
POST /api/v1/transactions/buy-airtime
POST /api/v1/transactions/paybill
POST /api/v1/transactions/buy-goods
POST /api/v1/transactions/scan-pay

# Transaction Status
GET /api/v1/transactions/:id/status
GET /api/v1/transactions/:id

# Exchange Rates
GET /api/v1/minmo/rates/btc-kes

# Receipts
GET /api/v1/receipts/:id
GET /api/v1/receipts/:id.pdf

# Webhooks (Internal)
POST /api/v1/webhooks/minmo
POST /api/v1/webhooks/mpesa

# Health Checks
GET /health
GET /ready
```

## 🔒 **Security Features**

- **Webhook Signature Verification**: HMAC-SHA256
- **Rate Limiting**: IP-based (60 req/min)
- **Input Validation**: Zod schemas
- **CORS Protection**: Configurable origins
- **No Authentication**: Anonymous transactions

## 📊 **Monitoring & Observability**

### **Health Checks**
- All services have `/health` and `/health/ready` endpoints
- Kubernetes liveness and readiness probes
- Docker health checks

### **Logging**
- Structured JSON logging
- Request/response logging
- Error tracking

### **Metrics**
- Prometheus metrics (optional)
- Grafana dashboards (optional)

## 🚀 **Deployment Options**

### **Option 1: Docker Compose (Recommended for Development)**
```bash
# Quick start
./scripts/deploy-minmo.sh

# Manual
cd infrastructure/docker
docker-compose -f docker-compose.minmo.yml up -d
```

### **Option 2: Kubernetes (Production)**
```bash
# Apply manifests
kubectl apply -f infrastructure/kubernetes/deployments/minmo-deployments.yaml
kubectl apply -f infrastructure/kubernetes/services/minmo-services.yaml

# Check status
kubectl get pods -n bitpesa-minmo
```

### **Option 3: Cloud Deployment**
- **AWS**: ECS/EKS with RDS and ElastiCache
- **GCP**: GKE with Cloud SQL and Memorystore
- **Azure**: AKS with Azure Database and Redis Cache

## 🔧 **Configuration**

### **Required Environment Variables**
```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# MinMo Integration
MINMO_API_KEY=your_minmo_api_key
MINMO_WEBHOOK_SECRET=your_minmo_webhook_secret

# M-Pesa (Safaricom Daraja)
DARAJA_CONSUMER_KEY=your_daraja_consumer_key
DARAJA_CONSUMER_SECRET=your_daraja_consumer_secret
DARAJA_BUSINESS_SHORT_CODE=your_business_short_code
DARAJA_PASSKEY=your_daraja_passkey

# SMS Notifications
AFRICAS_TALKING_API_KEY=your_at_api_key
AFRICAS_TALKING_USERNAME=your_at_username

# Application URLs
API_BASE_URL=https://api.bitpesa.co.ke
WEB_BASE_URL=https://bitpesa.co.ke
```

## 🧪 **Testing**

### **Unit Tests**
```bash
# MinMo Service
cd services/minmo-service
npm test

# Transaction Service
cd services/transaction-service
npm test
```

### **Integration Tests**
```bash
# Run E2E tests
npm run test:e2e
```

### **API Testing**
```bash
# Test transaction creation
curl -X POST http://localhost:8000/api/v1/transactions/send-money \
  -H "Content-Type: application/json" \
  -d '{"recipientPhone":"254700000000","amount":1000}'

# Test health check
curl http://localhost:8000/health
```

## 📈 **Performance & Scaling**

### **Resource Requirements**
- **Minimal**: 2 CPU cores, 4GB RAM
- **Recommended**: 4 CPU cores, 8GB RAM
- **Production**: 8+ CPU cores, 16+ GB RAM

### **Scaling Strategy**
- **Horizontal**: Multiple replicas per service
- **Database**: Read replicas for analytics
- **Cache**: Redis clustering
- **CDN**: Static asset delivery

## 🔄 **Transaction Flow**

1. **User selects service** (Send Money, Airtime, etc.)
2. **Frontend creates transaction** via API
3. **MinMo swap created** with Bitcoin address
4. **User sends Bitcoin** to provided address
5. **MinMo webhook confirms** BTC received
6. **M-Pesa payment initiated** automatically
7. **User receives M-Pesa** credit
8. **Transaction completed** with receipt

## 🛠️ **Development**

### **Local Development**
```bash
# Start all services
docker-compose -f infrastructure/docker/docker-compose.minmo.yml up -d

# Run migrations
docker exec -it bitpesa-transaction-service-1 npx prisma migrate dev

# View logs
docker-compose -f infrastructure/docker/docker-compose.minmo.yml logs -f
```

### **Adding New Features**
1. Update service code
2. Update API documentation
3. Add tests
4. Update deployment configs
5. Deploy with scripts

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Services not starting**
   ```bash
   # Check logs
   docker-compose logs service-name
   
   # Check health
   curl http://localhost:port/health
   ```

2. **Database connection issues**
   ```bash
   # Check PostgreSQL
   docker exec -it bitpesa-postgres-1 psql -U bitpesa -d bitpesa
   ```

3. **MinMo API issues**
   ```bash
   # Test MinMo connection
   curl -H "Authorization: Bearer $MINMO_API_KEY" $MINMO_API_URL/health
   ```

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=debug
docker-compose up -d
```

## 📚 **Documentation**

- **API Documentation**: `http://localhost:8000/api/docs`
- **Service Health**: `http://localhost:8000/health`
- **MinMo Integration**: `services/minmo-service/README.md`
- **Full Specification**: `bitpesa_minmo_revised.md`

## 🤝 **Support**

- **Issues**: GitHub Issues
- **Documentation**: Project Wiki
- **Community**: GitHub Discussions

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Bitcoin community in Kenya** ⚡🇰🇪

*Enable seamless Bitcoin payments across Kenya with the power of MinMo and M-Pesa integration.*

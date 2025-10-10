# MinMo Service

MinMo API integration service for BitPesa Bridge platform. This service handles all Bitcoin operations through MinMo's infrastructure, replacing the need for direct Lightning Network integration.

## 🚀 Features

- **Bitcoin Swap Creation**: Create BTC to KES swaps via MinMo API
- **Exchange Rate Fetching**: Get real-time BTC/KES exchange rates
- **Swap Status Tracking**: Monitor swap progress and completion
- **Webhook Processing**: Handle MinMo webhook events for real-time updates
- **Security**: Webhook signature verification for secure communication

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Transaction     │    │ MinMo Service   │    │ MinMo API       │
│ Service         │───▶│                 │───▶│                 │
│                 │    │ • Swap Creation │    │ • Bitcoin Ops   │
│ • Orchestration │    │ • Rate Fetching │    │ • Exchange      │
│ • Status Updates│    │ • Webhook Handle│    │ • Custody       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 API Endpoints

### Swap Operations
- `POST /minmo/swaps` - Create a new Bitcoin to KES swap
- `GET /minmo/swaps/:swapId` - Get swap status
- `GET /minmo/rates/btc-kes` - Get current BTC/KES exchange rate

### Webhooks
- `POST /minmo/webhooks` - Handle MinMo webhook events

### Health
- `GET /health` - Service health check
- `GET /health/ready` - Readiness check

## 🔧 Configuration

### Environment Variables

```bash
# Service Configuration
PORT=3000
NODE_ENV=production

# MinMo API Configuration
MINMO_API_URL=https://api.minmo.com
MINMO_API_KEY=your_minmo_api_key_here
MINMO_WEBHOOK_SECRET=your_minmo_webhook_secret_here

# Application URLs
API_BASE_URL=https://api.bitpesa.co.ke
WEB_BASE_URL=https://bitpesa.co.ke

# CORS Configuration
ALLOWED_ORIGINS=https://bitpesa.co.ke,https://api.bitpesa.co.ke

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- pnpm 8.x or higher
- MinMo API credentials

### Installation

1. **Install dependencies**
```bash
pnpm install
```

2. **Configure environment**
```bash
cp env.example .env
# Edit .env with your MinMo API credentials
```

3. **Start development server**
```bash
pnpm run start:dev
```

4. **Build for production**
```bash
pnpm run build
pnpm run start:prod
```

## 🐳 Docker

### Build Image
```bash
docker build -t bitpesa/minmo-service:latest .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e MINMO_API_KEY=your_api_key \
  -e MINMO_WEBHOOK_SECRET=your_webhook_secret \
  bitpesa/minmo-service:latest
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:cov

# E2E tests
pnpm run test:e2e
```

## 📚 API Documentation

Once the service is running, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/health`

## 🔄 Webhook Events

The service handles the following MinMo webhook events:

- `swap.created` - Swap created successfully
- `swap.confirmed` - BTC received, ready for M-Pesa
- `swap.completed` - Swap fully completed
- `swap.failed` - Swap failed
- `swap.expired` - Swap expired (user didn't pay)

## 🔒 Security

- **Webhook Signature Verification**: All webhooks are verified using HMAC-SHA256
- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: All inputs validated using class-validator
- **CORS Protection**: Configurable allowed origins

## 📊 Monitoring

- **Health Checks**: Built-in health and readiness endpoints
- **Structured Logging**: JSON-formatted logs with context
- **Error Tracking**: Comprehensive error handling and logging
- **Metrics**: Request/response logging for monitoring

## 🔧 Development

### Project Structure
```
src/
├── minmo/
│   ├── dto/                 # Data Transfer Objects
│   ├── minmo.controller.ts  # REST API endpoints
│   ├── minmo.service.ts     # Business logic
│   ├── minmo-client.ts     # MinMo API client
│   ├── webhook.handler.ts  # Webhook processing
│   └── minmo.module.ts     # Module definition
├── health/
│   └── health.controller.ts # Health check endpoints
├── app.module.ts           # Main application module
└── main.ts                 # Application entry point
```

### Code Style
- **ESLint**: Configured for TypeScript
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure `MINMO_API_KEY` and `MINMO_WEBHOOK_SECRET`
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure health checks
- [ ] Test webhook endpoints

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minmo-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: minmo-service
  template:
    metadata:
      labels:
        app: minmo-service
    spec:
      containers:
      - name: minmo-service
        image: bitpesa/minmo-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: MINMO_API_KEY
          valueFrom:
            secretKeyRef:
              name: bitpesa-secrets
              key: minmo-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

**Built with ❤️ for the BitPesa Bridge platform** ⚡🇰🇪

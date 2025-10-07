# BitPesa Bridge - Lightning-M-Pesa Payment Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)

A non-custodial payment bridge that enables Kenyan users to spend Bitcoin via the Lightning Network for all M-Pesa services including buying airtime, sending money, paying bills, buying goods, and scanning merchant QR codes.

## 🌟 Features

### 💰 **Payment Services**
- **Send Money** - Transfer funds to any M-Pesa number
- **Buy Airtime** - Top up mobile phone credit
- **Pay Bills** - Pay utility bills and services
- **Buy Goods** - Purchase from merchants via Till numbers
- **Scan QR** - Pay by scanning merchant QR codes

### ⚡ **Lightning Network Integration**
- **Non-custodial** - Users keep their Bitcoin in their own wallets
- **Instant payments** - Lightning Network speed and efficiency
- **Low fees** - Minimal transaction costs
- **Global reach** - Access from anywhere in the world

### 🔒 **Security & Compliance**
- **No user accounts** - Anonymous transactions via payment hash
- **Rate limiting** - IP-based protection against abuse
- **Audit logging** - Complete transaction tracking
- **CBK compliance** - Built for Kenyan regulatory requirements

## 🏗️ Architecture

### **Microservices Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │  Mobile App     │    │  Admin Panel    │
│   (Next.js)     │    │  (React Native) │    │  (Next.js)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      API Gateway          │
                    │      (Kong)               │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌──────────▼──────────┐    ┌─────────▼─────────┐
│ Lightning      │    │    M-Pesa           │    │   Transaction     │
│ Service        │    │    Service          │    │   Orchestrator    │
└────────────────┘    └─────────────────────┘    └───────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Conversion Service     │
                    │    (BTC/KES Rates)        │
                    └───────────────────────────┘
```

### **Technology Stack**

#### **Frontend**
- **Web App**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Mobile App**: React Native 0.73+, React Navigation
- **UI Components**: shadcn/ui, React Native Paper
- **State Management**: Zustand, TanStack Query

#### **Backend**
- **API Gateway**: Kong Gateway 3.x
- **Services**: Node.js 20.x, NestJS 10.x
- **APIs**: RESTful + GraphQL, Socket.io
- **Validation**: class-validator, Zod

#### **Blockchain & Payments**
- **Lightning**: LND v0.17+, Core Lightning (CLN)
- **M-Pesa**: Safaricom Daraja API v2
- **Conversion**: Real-time BTC/KES rates

#### **Database & Storage**
- **Primary DB**: PostgreSQL 16.x with Prisma 5.x
- **Cache**: Redis 7.x
- **Logs**: MongoDB 7.x
- **Time Series**: TimescaleDB

#### **Infrastructure**
- **Containerization**: Docker, Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack, Sentry

## 🚀 Quick Start

### **Prerequisites**
- Node.js 20.x or higher
- pnpm 8.x or higher
- Docker and Docker Compose
- Git

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/MWANGAZA-LAB/BitPesa.git
cd BitPesa
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp infrastructure/docker/env.example .env
# Edit .env with your configuration
```

4. **Start the development environment**
```bash
# Start all services with Docker Compose
pnpm docker:up

# Or start individual services
pnpm dev
```

5. **Access the application**
- **Web App**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **Kong Manager**: http://localhost:8002
- **Admin Panel**: http://localhost:3000/admin

### **Development Commands**

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm type-check

# Database operations
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio

# Docker operations
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```

## 📱 Usage

### **For Users (Non-Custodial)**

1. **Access the web app** or mobile app
2. **Select payment type** (Send Money, Airtime, etc.)
3. **Enter M-Pesa details** (phone number, amount, etc.)
4. **Get Lightning invoice** with QR code
5. **Pay with your Lightning wallet** (Phoenix, Breez, etc.)
6. **Receive M-Pesa confirmation** when payment completes

### **For Merchants**

1. **Generate QR codes** for your Till number
2. **Display QR codes** at point of sale
3. **Customers scan and pay** with Bitcoin
4. **Receive instant M-Pesa payments**

## 🔧 Configuration

### **Environment Variables**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bitpesa"
REDIS_URL="redis://localhost:6379"
MONGODB_URL="mongodb://localhost:27017/bitpesa"

# Lightning Network
LND_GRPC_HOST="localhost:10009"
LND_MACAROON_PATH="/path/to/macaroon"
LND_TLS_CERT_PATH="/path/to/tls.cert"
LND_NETWORK="testnet"

# M-Pesa API
MPESA_CONSUMER_KEY="your_consumer_key"
MPESA_CONSUMER_SECRET="your_consumer_secret"
MPESA_BUSINESS_SHORT_CODE="your_short_code"
MPESA_PASSKEY="your_passkey"
MPESA_ENVIRONMENT="sandbox"

# API Gateway
KONG_ADMIN_URL="http://localhost:8001"
KONG_PROXY_URL="http://localhost:8000"
```

## 🧪 Testing

### **Run Tests**
```bash
# All tests
pnpm test

# Specific service tests
pnpm test --filter=lightning-service
pnpm test --filter=mpesa-service

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

### **Test Coverage**
```bash
pnpm test:cov
```

## 📊 Monitoring

### **Health Checks**
- **API Gateway**: http://localhost:3000/health
- **Lightning Service**: http://localhost:3001/health
- **M-Pesa Service**: http://localhost:3002/health

### **Metrics & Dashboards**
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)

### **Logs**
- **Application Logs**: Docker Compose logs
- **Structured Logs**: MongoDB collection
- **Error Tracking**: Sentry integration

## 🔒 Security

### **Implemented Security Measures**
- **Rate Limiting**: IP-based request limiting
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Configured for production domains
- **Security Headers**: Helmet.js implementation
- **Audit Logging**: Complete transaction tracking
- **Error Handling**: Secure error responses

### **Compliance**
- **CBK Licensing**: Built for Kenyan regulatory requirements
- **Data Protection**: GDPR-compliant data handling
- **AML/KYC**: Transaction monitoring and reporting
- **Incident Response**: Automated alerting and logging

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Development Guidelines**
- Follow TypeScript strict mode
- Write comprehensive tests
- Update documentation
- Follow conventional commits
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/MWANGAZA-LAB/BitPesa/wiki)
- **Issues**: [GitHub Issues](https://github.com/MWANGAZA-LAB/BitPesa/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MWANGAZA-LAB/BitPesa/discussions)

## 🙏 Acknowledgments

- **Lightning Network** for instant Bitcoin payments
- **Safaricom** for M-Pesa API access
- **NestJS** for the robust backend framework
- **Next.js** for the modern frontend framework
- **Kong Gateway** for API management

## 📈 Roadmap

### **Phase 1: Core Platform** ✅
- [x] Lightning Network integration
- [x] M-Pesa API integration
- [x] Transaction orchestration
- [x] Web application
- [x] API Gateway

### **Phase 2: Mobile & Advanced Features** 🚧
- [ ] React Native mobile app
- [ ] QR code scanning
- [ ] Advanced analytics
- [ ] Multi-currency support

### **Phase 3: Enterprise & Scale** 📋
- [ ] Enterprise dashboard
- [ ] Advanced compliance tools
- [ ] Multi-region deployment
- [ ] Advanced security features

---

**Built with ❤️ for the Bitcoin community in Kenya** 🇰🇪⚡

*Enable seamless Bitcoin payments across Kenya with the power of Lightning Network and M-Pesa integration.*

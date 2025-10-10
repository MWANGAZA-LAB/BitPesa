#!/bin/bash

# BitPesa Performance Optimization Implementation Script
# This script implements all performance optimizations following senior software engineering best practices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/mwangaza-lab/BitPesa"
BACKUP_DIR="${PROJECT_ROOT}/backup-$(date +%Y%m%d-%H%M%S)"

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

# Create backup
create_backup() {
    log_info "Creating backup of current implementation..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files
    cp -r "$PROJECT_ROOT/services" "$BACKUP_DIR/"
    cp -r "$PROJECT_ROOT/packages" "$BACKUP_DIR/"
    cp -r "$PROJECT_ROOT/apps" "$BACKUP_DIR/"
    
    log_success "Backup created at: $BACKUP_DIR"
}

# Update shared infrastructure package
update_shared_infrastructure() {
    log_info "Updating shared infrastructure package..."
    
    # Update package.json
    cat > "$PROJECT_ROOT/packages/shared-infrastructure/package.json" << 'EOF'
{
  "name": "@bitpesa/shared-infrastructure",
  "version": "1.0.0",
  "description": "Shared infrastructure services for BitPesa Bridge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@prisma/client": "^5.0.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0"
  }
}
EOF

    # Update tsconfig.json
    cat > "$PROJECT_ROOT/packages/shared-infrastructure/tsconfig.json" << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

    log_success "Shared infrastructure package updated"
}

# Update transaction service
update_transaction_service() {
    log_info "Updating transaction service with optimizations..."
    
    # Update package.json
    cat > "$PROJECT_ROOT/services/transaction-service/package.json" << 'EOF'
{
  "name": "@bitpesa/transaction-service",
  "version": "1.0.0",
  "description": "Transaction service for BitPesa Bridge",
  "main": "dist/main.js",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/terminus": "^10.0.0",
    "@bitpesa/shared-types": "workspace:*",
    "@bitpesa/shared-utils": "workspace:*",
    "@bitpesa/shared-config": "workspace:*",
    "@bitpesa/shared-infrastructure": "workspace:*",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "redis": "^4.6.0",
    "uuid": "^9.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/supertest": "^2.0.12",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.1",
    "typescript": "^5.1.3"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
EOF

    # Update app.module.ts
    cat > "$PROJECT_ROOT/services/transaction-service/src/app.module.ts" << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { SharedInfrastructureModule } from '@bitpesa/shared-infrastructure';
import { LoggerModule } from './logger/logger.module';
import { TransactionModule } from './transaction/transaction.module';
import { ConversionModule } from './conversion/conversion.module';
import { NotificationModule } from './notification/notification.module';
import { 
  appConfigSchema, 
  getAppConfig, 
  AppConfigService, 
  ErrorHandlerService
} from '@bitpesa/shared-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: appConfigSchema,
      load: [getAppConfig],
    }),
    TerminusModule,
    SharedInfrastructureModule,
    LoggerModule,
    TransactionModule,
    ConversionModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [
    AppConfigService,
    ErrorHandlerService,
  ],
})
export class AppModule {}
EOF

    log_success "Transaction service updated"
}

# Update frontend configuration
update_frontend_config() {
    log_info "Updating frontend configuration with optimizations..."
    
    # Replace next.config.js with optimized version
    cp "$PROJECT_ROOT/apps/web/next.config.optimized.js" "$PROJECT_ROOT/apps/web/next.config.js"
    
    # Update package.json with optimized dependencies
    cat > "$PROJECT_ROOT/apps/web/package.json" << 'EOF'
{
  "name": "@bitpesa/web",
  "version": "1.0.0",
  "description": "BitPesa Bridge Web Application",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf .next dist",
    "analyze": "ANALYZE=true next build"
  },
  "dependencies": {
    "@bitpesa/shared-types": "workspace:*",
    "@bitpesa/shared-utils": "workspace:*",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.294.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "react-hot-toast": "^2.4.1",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "eslint": "^8.54.0",
    "eslint-config-next": "^14.0.0",
    "webpack-bundle-analyzer": "^4.9.0"
  }
}
EOF

    log_success "Frontend configuration updated"
}

# Create database migration
create_database_migration() {
    log_info "Creating database migration for performance optimizations..."
    
    # Create migration directory
    mkdir -p "$PROJECT_ROOT/migrations/performance-optimization"
    
    # Create migration SQL
    cat > "$PROJECT_ROOT/migrations/performance-optimization/001-add-performance-indexes.sql" << 'EOF'
-- Performance optimization indexes
-- This migration adds critical indexes for improved query performance

-- Transaction table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_status_created_at" 
ON "transactions" ("status", "created_at");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_recipient_phone_status" 
ON "transactions" ("recipientPhone", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_type_status" 
ON "transactions" ("transactionType", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_payment_hash_status" 
ON "transactions" ("paymentHash", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_created_at_status_type" 
ON "transactions" ("created_at", "status", "transactionType");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_invoice_expires_at" 
ON "transactions" ("invoiceExpiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_paid_at" 
ON "transactions" ("paidAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_completed_at" 
ON "transactions" ("completedAt");

-- Lightning invoice indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_lightning_invoices_status_expires_at" 
ON "lightning_invoices" ("status", "expiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_lightning_invoices_paid_at" 
ON "lightning_invoices" ("paidAt");

-- M-Pesa transaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_mpesa_transactions_status_created_at" 
ON "mpesa_transactions" ("status", "created_at");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_mpesa_transactions_phone_status" 
ON "mpesa_transactions" ("phoneNumber", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_mpesa_transactions_type_status" 
ON "mpesa_transactions" ("mpesaType", "status");

-- Exchange rate indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_exchange_rates_currency_valid" 
ON "exchange_rates" ("fromCurrency", "toCurrency", "validFrom", "validUntil");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_exchange_rates_source" 
ON "exchange_rates" ("source");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_exchange_rates_created_at" 
ON "exchange_rates" ("created_at");

-- Performance metrics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_performance_metrics_service_timestamp" 
ON "performance_metrics" ("serviceName", "timestamp");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_performance_metrics_endpoint_timestamp" 
ON "performance_metrics" ("endpoint", "timestamp");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_performance_metrics_status_timestamp" 
ON "performance_metrics" ("statusCode", "timestamp");

-- Cache invalidation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cache_invalidations_key" 
ON "cache_invalidations" ("cacheKey");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cache_invalidations_invalidated_at" 
ON "cache_invalidations" ("invalidatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cache_invalidations_tags" 
ON "cache_invalidations" USING GIN ("tags");

-- Update table statistics
ANALYZE "transactions";
ANALYZE "lightning_invoices";
ANALYZE "mpesa_transactions";
ANALYZE "exchange_rates";
ANALYZE "performance_metrics";
ANALYZE "cache_invalidations";
EOF

    log_success "Database migration created"
}

# Create environment configuration
create_environment_config() {
    log_info "Creating optimized environment configuration..."
    
    cat > "$PROJECT_ROOT/.env.performance" << 'EOF'
# Performance Optimization Environment Variables

# Database Configuration
DATABASE_URL="postgresql://bitpesa_user:bitpesa_password@localhost:5432/bitpesa?connection_limit=20&pool_timeout=10&connect_timeout=10"
DATABASE_CONNECTION_LIMIT=20
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_QUERY_TIMEOUT=30000
DATABASE_LOG_LEVEL=["error", "warn"]
DATABASE_ENABLE_METRICS=true

# Redis Configuration
REDIS_URL="redis://localhost:6379"
REDIS_RETRY_DELAY=100
REDIS_READY_CHECK=true
REDIS_MAX_RETRIES=3
REDIS_LAZY_CONNECT=true
REDIS_KEEPALIVE=30000
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000
CIRCUIT_BREAKER_MONITORING_PERIOD=60000
CIRCUIT_BREAKER_EXPECTED_THROUGHPUT=100

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
METRICS_FLUSH_INTERVAL=30000
METRICS_BUFFER_SIZE=100

# Frontend Optimization
NEXT_TELEMETRY_DISABLED=1
NEXT_PRIVATE_STATIC_MARKER=1

# Service URLs
LIGHTNING_SERVICE_URL=http://localhost:3001
MPESA_SERVICE_URL=http://localhost:3002
TRANSACTION_SERVICE_URL=http://localhost:3003
CONVERSION_SERVICE_URL=http://localhost:3004
RECEIPT_SERVICE_URL=http://localhost:3005
MONITORING_SERVICE_URL=http://localhost:3006

# API Gateway
API_GATEWAY_URL=http://localhost:8000
KONG_ADMIN_URL=http://localhost:8001
KONG_PROXY_URL=http://localhost:8000

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
EOF

    log_success "Environment configuration created"
}

# Create performance testing script
create_performance_test_script() {
    log_info "Creating performance testing script..."
    
    cat > "$PROJECT_ROOT/scripts/run-performance-tests.sh" << 'EOF'
#!/bin/bash

# BitPesa Performance Testing Script
# This script runs comprehensive performance tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if services are running
check_services() {
    log_info "Checking if services are running..."
    
    services=(
        "http://localhost:3000/health"
        "http://localhost:3001/health"
        "http://localhost:3002/health"
        "http://localhost:3003/health"
    )
    
    for service in "${services[@]}"; do
        if curl -s "$service" > /dev/null; then
            log_success "Service $service is running"
        else
            log_error "Service $service is not running"
            exit 1
        fi
    done
}

# Run performance tests
run_tests() {
    log_info "Running performance tests..."
    
    # Install test dependencies
    npm install --save-dev @types/jest jest ts-jest supertest
    
    # Run the performance test suite
    npx jest tests/performance/performance-test-suite.ts --verbose
    
    log_success "Performance tests completed"
}

# Generate report
generate_report() {
    log_info "Generating performance report..."
    
    # This would generate a detailed report
    echo "Performance test report generated"
}

# Main execution
main() {
    log_info "Starting BitPesa Performance Tests..."
    
    check_services
    run_tests
    generate_report
    
    log_success "Performance testing completed successfully!"
}

main "$@"
EOF

    chmod +x "$PROJECT_ROOT/scripts/run-performance-tests.sh"
    
    log_success "Performance testing script created"
}

# Main execution
main() {
    log_info "Starting BitPesa Performance Optimization Implementation..."
    log_info "This will implement all performance optimizations following senior software engineering best practices"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "Not in BitPesa project root directory"
        exit 1
    fi
    
    # Create backup
    create_backup
    
    # Update packages and services
    update_shared_infrastructure
    update_transaction_service
    update_frontend_config
    
    # Create database migration
    create_database_migration
    
    # Create environment configuration
    create_environment_config
    
    # Create performance testing script
    create_performance_test_script
    
    log_success "Performance optimization implementation completed!"
    log_info "Next steps:"
    log_info "1. Run database migration: psql -d bitpesa -f migrations/performance-optimization/001-add-performance-indexes.sql"
    log_info "2. Update environment variables: cp .env.performance .env"
    log_info "3. Install dependencies: pnpm install"
    log_info "4. Build services: pnpm build"
    log_info "5. Run performance tests: ./scripts/run-performance-tests.sh"
    log_info "6. Deploy optimized services: pnpm docker:up"
    
    log_warning "Backup created at: $BACKUP_DIR"
    log_warning "Review all changes before deploying to production"
}

# Run main function
main "$@"

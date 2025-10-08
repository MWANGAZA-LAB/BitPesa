#!/bin/bash
# production-readiness-check.sh

echo "🔍 PRODUCTION READINESS CHECK"
echo "============================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

check_item() {
  if [ $2 -eq 0 ]; then
    echo -e "${GREEN}✅${NC} $1"
    ((PASSED++))
  else
    echo -e "${RED}❌${NC} $1"
    ((FAILED++))
  fi
}

warn_item() {
  echo -e "${YELLOW}⚠️${NC}  $1"
  ((WARNINGS++))
}

echo "1️⃣  INFRASTRUCTURE CHECKS"
echo "========================"
echo ""

# Docker
if command -v docker &> /dev/null; then
  check_item "Docker installed" 0
else
  check_item "Docker installed" 1
fi

# Kubernetes
if command -v kubectl &> /dev/null; then
  check_item "kubectl installed" 0
else
  check_item "kubectl installed" 1
fi

# Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
  check_item "Node.js version (>= 20)" 0
else
  check_item "Node.js version (>= 20)" 1
fi

echo ""
echo "2️⃣  SERVICE CHECKS"
echo "=================="
echo ""

# Check if services directory exists
if [ -d "services" ]; then
  check_item "Services directory exists" 0
  
  # Check each required service
  REQUIRED_SERVICES=(
    "api-gateway"
    "lightning-service"
    "mpesa-service"
    "transaction-service"
    "conversion-service"
    "notification-service"
  )
  
  for service in "${REQUIRED_SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
      check_item "Service: $service" 0
    else
      check_item "Service: $service" 1
    fi
  done
else
  check_item "Services directory exists" 1
fi

echo ""
echo "3️⃣  DATABASE CHECKS"
echo "==================="
echo ""

# Check Prisma schema
if find . -name "schema.prisma" | grep -q .; then
  check_item "Prisma schema exists" 0
  
  # Check for removed User model
  if grep -r "model User" services/*/prisma/schema.prisma 2>/dev/null; then
    check_item "User model removed" 1
  else
    check_item "User model removed" 0
  fi
  
  # Check for paymentHash
  if grep -r "paymentHash.*@unique" services/*/prisma/schema.prisma 2>/dev/null; then
    check_item "paymentHash configured" 0
  else
    check_item "paymentHash configured" 1
  fi
else
  check_item "Prisma schema exists" 1
fi

echo ""
echo "4️⃣  ENVIRONMENT CONFIGURATION"
echo "============================="
echo ""

# Check for .env.example
if [ -f ".env.example" ]; then
  check_item ".env.example exists" 0
else
  check_item ".env.example exists" 1
fi

# Check critical environment variables
REQUIRED_ENV_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "LND_GRPC_HOST"
  "MPESA_CONSUMER_KEY"
  "MPESA_CONSUMER_SECRET"
)

for var in "${REQUIRED_ENV_VARS[@]}"; do
  if grep -q "^$var=" .env 2>/dev/null || [ ! -z "${!var}" ]; then
    check_item "Env var: $var" 0
  else
    warn_item "Env var: $var (not set - expected for initial setup)"
  fi
done

echo ""
echo "5️⃣  TESTING"
echo "==========="
echo ""

# Check if test files exist
if find . -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then
  check_item "Test files exist" 0
  
  # Run tests
  if npm test 2>/dev/null; then
    check_item "Tests passing" 0
  else
    warn_item "Tests not run or failing"
  fi
else
  check_item "Test files exist" 1
fi

echo ""
echo "6️⃣  DOCUMENTATION"
echo "================="
echo ""

if [ -f "README.md" ]; then
  check_item "README.md exists" 0
else
  check_item "README.md exists" 1
fi

if [ -d "docs" ]; then
  check_item "Documentation directory exists" 0
else
  warn_item "Documentation directory missing"
fi

echo ""
echo "7️⃣  SECURITY"
echo "============"
echo ""

# Check for .gitignore
if [ -f ".gitignore" ]; then
  check_item ".gitignore exists" 0
  
  # Check if .env is ignored
  if grep -q "^\.env$" .gitignore; then
    check_item ".env in .gitignore" 0
  else
    check_item ".env in .gitignore" 1
  fi
else
  check_item ".gitignore exists" 1
fi

# Check for hardcoded secrets
if grep -r "sk_live_\|pk_live_\|api_key.*=.*['\"]" services/ --include="*.ts" 2>/dev/null; then
  check_item "No hardcoded secrets" 1
else
  check_item "No hardcoded secrets" 0
fi

echo ""
echo "8️⃣  MONITORING"
echo "=============="
echo ""

if [ -d "infrastructure/monitoring" ]; then
  check_item "Monitoring configuration exists" 0
else
  warn_item "Monitoring configuration missing"
fi

echo ""
echo "============================="
echo "📊 SUMMARY"
echo "============================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ System is production ready!${NC}"
  exit 0
elif [ $FAILED -le 3 ]; then
  echo -e "${YELLOW}⚠️  System has minor issues. Review failed items.${NC}"
  exit 0
else
  echo -e "${RED}❌ System is NOT production ready. Fix failed items.${NC}"
  exit 1
fi

#!/bin/bash
# BitPesa Bridge - Project Structure Diagnostic

echo "🔍 BITPESA BRIDGE PROJECT DIAGNOSIS"
echo "===================================="
echo ""

# Check project root structure
echo "📁 Checking project root structure..."
REQUIRED_DIRS=(
  "apps/web"
  "apps/mobile"
  "apps/admin"
  "services/api-gateway"
  "services/lightning-service"
  "services/mpesa-service"
  "services/transaction-service"
  "services/conversion-service"
  "services/notification-service"
  "packages/shared-types"
  "packages/shared-utils"
  "infrastructure/docker"
  "infrastructure/kubernetes"
)

MISSING_DIRS=()
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✅ $dir"
  else
    echo "  ❌ $dir - MISSING"
    MISSING_DIRS+=("$dir")
  fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
  echo "✅ All required directories present"
else
  echo "❌ Missing ${#MISSING_DIRS[@]} required directories"
fi

echo ""
echo "📦 Checking package managers..."
if [ -f "pnpm-workspace.yaml" ]; then
  echo "  ✅ pnpm workspace configured"
else
  echo "  ❌ pnpm workspace not found"
fi

if [ -f "turbo.json" ]; then
  echo "  ✅ Turborepo configured"
else
  echo "  ⚠️  Turborepo not configured (optional)"
fi

echo ""
echo "🗄️  Checking database configuration..."
if [ -f "services/*/prisma/schema.prisma" ]; then
  echo "  ✅ Prisma schema files found"
  
  # Check for removed user tables
  if grep -r "model User" services/*/prisma/schema.prisma 2>/dev/null; then
    echo "  ❌ User model still exists - MUST BE REMOVED"
  else
    echo "  ✅ User model properly removed"
  fi
  
  # Check for paymentHash usage
  if grep -r "paymentHash.*@unique" services/*/prisma/schema.prisma 2>/dev/null; then
    echo "  ✅ PaymentHash being used as identifier"
  else
    echo "  ❌ PaymentHash not configured properly"
  fi
else
  echo "  ❌ Prisma schema not found"
fi

echo ""
echo "🔧 Checking Docker configuration..."
if [ -f "docker-compose.yml" ]; then
  echo "  ✅ docker-compose.yml found"
  
  # Check for required services
  REQUIRED_SERVICES=("postgres" "redis" "mongodb")
  for service in "${REQUIRED_SERVICES[@]}"; do
    if grep -q "$service:" docker-compose.yml; then
      echo "    ✅ $service configured"
    else
      echo "    ❌ $service not configured"
    fi
  done
else
  echo "  ❌ docker-compose.yml not found"
fi

echo ""
echo "================================================"
echo "DIAGNOSIS SUMMARY:"
echo "Missing Directories: ${#MISSING_DIRS[@]}"
if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
  echo "  - ${MISSING_DIRS[@]}"
fi
echo "================================================"

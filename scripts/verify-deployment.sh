#!/bin/bash

# Reservation Safari - Deployment Verification Script
# Checks if all deployment files are in place

echo "════════════════════════════════════════════════════════════"
echo "  Reservation Safari - Deployment Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

MISSING=0

# Check Docker files
echo "Checking Docker configuration..."
for file in Dockerfile.frontend Dockerfile.backend docker-compose.yml .dockerignore; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ MISSING: $file"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Checking environment templates..."
for file in .env.example server/.env.example; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ MISSING: $file"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Checking deployment scripts..."
for file in scripts/deploy.sh scripts/setup.sh scripts/health-check.sh; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ MISSING: $file"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Checking documentation..."
for file in DEPLOYMENT.md QUICKSTART.md DEPLOYMENT_CHECKLIST.md; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ MISSING: $file"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Checking CI/CD..."
if [ -f ".github/workflows/deploy.yml" ]; then
    echo "  ✓ .github/workflows/deploy.yml"
else
    echo "  ✗ MISSING: .github/workflows/deploy.yml"
    MISSING=$((MISSING + 1))
fi

echo ""
echo "Checking application files..."
if [ -f "package.json" ]; then
    echo "  ✓ package.json"
else
    echo "  ✗ MISSING: package.json"
    MISSING=$((MISSING + 1))
fi

if [ -f "server/package.json" ]; then
    echo "  ✓ server/package.json"
else
    echo "  ✗ MISSING: server/package.json"
    MISSING=$((MISSING + 1))
fi

if [ -d "src" ]; then
    echo "  ✓ src/ directory"
else
    echo "  ✗ MISSING: src/ directory"
    MISSING=$((MISSING + 1))
fi

if [ -d "server" ]; then
    echo "  ✓ server/ directory"
else
    echo "  ✗ MISSING: server/ directory"
    MISSING=$((MISSING + 1))
fi

echo ""
echo "════════════════════════════════════════════════════════════"

if [ $MISSING -eq 0 ]; then
    echo "✅ All deployment files are present!"
    echo ""
    echo "Next steps:"
    echo "  1. Read QUICKSTART.md for 5-minute setup"
    echo "  2. Configure .env.production with your secrets"
    echo "  3. Run: bash scripts/deploy.sh production"
    echo "  4. Verify: bash scripts/health-check.sh"
    echo ""
    echo "Full documentation: See DEPLOYMENT.md"
    exit 0
else
    echo "❌ Found $MISSING missing files!"
    echo ""
    echo "Please ensure all deployment files are created."
    exit 1
fi

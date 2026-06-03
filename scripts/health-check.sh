#!/bin/bash

# Reservation Safari - Health Check Script

set -e

BACKEND_URL=${BACKEND_URL:-http://localhost:3001}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}

echo "Checking Reservation Safari Health..."
echo ""

# Check backend
echo -n "Backend API... "
if curl -sf "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    exit 1
fi

# Check frontend
echo -n "Frontend App... "
if curl -sf "${FRONTEND_URL}/" > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    exit 1
fi

# Check Docker containers
if command -v docker &> /dev/null; then
    echo -n "Docker containers... "
    backend_status=$(docker ps --filter "name=safari-backend" --filter "status=running" --format "{{.ID}}")
    frontend_status=$(docker ps --filter "name=safari-frontend" --filter "status=running" --format "{{.ID}}")
    
    if [ -n "$backend_status" ] && [ -n "$frontend_status" ]; then
        echo "✓ OK"
    else
        echo "✗ FAILED"
        exit 1
    fi
fi

echo ""
echo "✓ All health checks passed!"

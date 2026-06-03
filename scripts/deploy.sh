#!/bin/bash

# Reservation Safari - Docker Deployment Script
# Usage: ./scripts/deploy.sh [production|staging|development]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
ENV_FILE=".env.${ENVIRONMENT}"

echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Reservation Safari - Docker Deployment${NC}"
echo -e "${YELLOW}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}\n"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file '$ENV_FILE' not found!${NC}"
    echo -e "Please create the file using: cp .env.example $ENV_FILE"
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | xargs)

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Build images
echo -e "\n${YELLOW}Building Docker images...${NC}"
docker-compose -f docker-compose.yml build --no-cache

# Start containers
echo -e "\n${YELLOW}Starting containers...${NC}"
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 5

# Check backend health
echo -e "\n${YELLOW}Checking backend health...${NC}"
if docker-compose exec -T backend curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    docker-compose logs backend
    exit 1
fi

# Check frontend health
echo -e "\n${YELLOW}Checking frontend health...${NC}"
if docker-compose exec -T frontend curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    docker-compose logs frontend
    exit 1
fi

# Display service URLs
echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment successful!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Service URLs:${NC}"
echo -e "  Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo -e "  Backend:  http://localhost:${BACKEND_PORT:-3001}"
echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "  View logs:     docker-compose logs -f"
echo -e "  Stop services: docker-compose down"
echo -e "  Restart:       docker-compose restart"
echo -e "  View status:   docker-compose ps\n"

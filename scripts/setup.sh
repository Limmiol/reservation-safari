#!/bin/bash

# Reservation Safari - Local Development Setup
# Sets up the project for local development

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up Reservation Safari for local development...${NC}\n"

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
npm install --prefix server

# Create .env files if they don't exist
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local...${NC}"
    cp .env.example .env.local
fi

if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}Creating server/.env...${NC}"
    cp server/.env.example server/.env
fi

# Create uploads directory
mkdir -p server/uploads

echo -e "\n${GREEN}✓ Setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Update .env.local with your Base44 credentials"
echo -e "  2. Update server/.env with your configuration"
echo -e "  3. Start backend:  npm run server"
echo -e "  4. Start frontend: npm run dev"
echo -e "  5. Open http://localhost:5173\n"

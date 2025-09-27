#!/bin/bash

# 🎲 Ronin Dice Game - Setup Script
# This script sets up and runs the dice game application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Header
echo ""
echo "🎲 Ronin Dice Game - Setup & Launch"
echo "===================================="
echo ""

# Check Node.js installation
print_step "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check npm installation
print_step "Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Install backend dependencies
echo ""
print_step "Installing backend dependencies..."
cd backend
# Always clean and reinstall on new platform to avoid native module issues
if [ -d "node_modules" ]; then
    print_warning "Removing old node_modules to avoid platform conflicts..."
    rm -rf node_modules package-lock.json
fi
npm install --silent
# Rebuild native modules for current platform
npm rebuild --silent
print_success "Backend dependencies installed and native modules rebuilt"

# Check backend .env file
if [ ! -f ".env" ]; then
    print_warning "Backend .env file not found. Creating with default values..."
    cat > .env << 'EOF'
# Server Configuration
PORT=3001

# Database
DATABASE_URL=./dice_game.db

# JWT Secret (auto-generated)
JWT_SECRET=default-secret-change-in-production-$(openssl rand -hex 32)

# Ronin Testnet Configuration
RPC_URL=https://saigon-testnet.roninchain.com/rpc

# Contract Address (already deployed)
CONTRACT_ADDRESS=0x089d3d51cb3c8ca070d5648C9D1c7d765533E832

# Private Key (optional - only for contract interactions from backend)
# PRIVATE_KEY=your-private-key-here

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
EOF
    print_success "Backend .env file created"
else
    print_success "Backend .env file exists"
fi

# Install frontend dependencies
echo ""
print_step "Installing frontend dependencies..."
cd ../frontend
# Always clean and reinstall on new platform to avoid native module issues
if [ -d "node_modules" ]; then
    print_warning "Removing old node_modules to avoid platform conflicts..."
    rm -rf node_modules package-lock.json
fi
npm install --silent
print_success "Frontend dependencies installed"

# Check if backend is already running
echo ""
print_step "Checking for existing processes..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Backend is already running on port 3001"
    read -p "Do you want to restart it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Stopping existing backend..."
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        sleep 2
        print_success "Existing backend stopped"
    fi
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Frontend is already running on port 5173"
    read -p "Do you want to restart it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Stopping existing frontend..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null
        sleep 2
        print_success "Existing frontend stopped"
    fi
fi

# Start backend
echo ""
print_step "Starting backend server..."
cd ../backend
nohup node server.js > backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend started successfully (PID: $BACKEND_PID)"
else
    print_error "Failed to start backend. Check backend/backend.log for errors."
    exit 1
fi

# Start frontend
echo ""
print_step "Starting frontend development server..."
cd ../frontend

# Function to open browser
open_browser() {
    URL=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open $URL
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open $URL
        fi
    fi
}

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "========================================"
echo ""
echo "📍 Services are running at:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend:  http://localhost:3001"
echo ""
echo "📝 Logs:"
echo "   • Backend: backend/backend.log"
echo "   • Frontend: Terminal output below"
echo ""
echo "🎮 How to play:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Connect your Ronin Wallet or MetaMask"
echo "   3. Get testnet RON from https://faucet.roninchain.com/"
echo "   4. Deposit funds and start playing!"
echo ""
echo "💡 Press Ctrl+C to stop all services"
echo ""
print_step "Opening browser..."
sleep 2
open_browser "http://localhost:5173"

# Start frontend in foreground
npm run dev

# Cleanup on exit
trap "echo ''; print_step 'Shutting down services...'; lsof -ti:3001 | xargs kill -9 2>/dev/null; lsof -ti:5173 | xargs kill -9 2>/dev/null; print_success 'Services stopped'; exit 0" INT TERM
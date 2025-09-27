#!/bin/bash

# Fix script for VPS deployment (Linux platform)
# This fixes the "invalid ELF header" error for SQLite3

echo "🔧 Fixing native modules for VPS deployment..."
echo ""

# Backend fix
echo "📦 Fixing backend modules..."
cd backend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm rebuild
echo "✅ Backend fixed"
echo ""

# Frontend fix  
echo "📦 Fixing frontend modules..."
cd ../frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
echo "✅ Frontend fixed"
echo ""

echo "🎉 All native modules rebuilt for Linux!"
echo ""
echo "Now you can run:"
echo "  ./setup.sh"
echo "or start services manually:"
echo "  cd backend && npm start"
echo "  cd frontend && npm run dev"
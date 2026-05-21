#!/bin/bash
# PlanMaster Electron Build Script
# Usage: ./build.sh [mac|win|linux|all]

set -e

APP_NAME="PlanMaster"
VERSION=$(grep "CURRENT_VERSION" app.py | head -1 | sed "s/.*'\(.*\)'.*/\1/")
PLATFORM=${1:-mac}

echo "=== PlanMaster Electron Builder ==="
echo "Version: $VERSION"
echo "Platform: $PLATFORM"

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "Error: node not found"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm not found"
    exit 1
fi

# Install root dependencies (Electron)
echo "Installing Electron dependencies..."
npm install

# Build Vue frontend
echo "Building Vue frontend..."
cd frontend
npm ci
npm run build
cd ..

# Build Electron app
echo "Building Electron app..."
case $PLATFORM in
    mac)
        npx electron-builder --mac
        ;;
    win)
        npx electron-builder --win
        ;;
    linux)
        npx electron-builder --linux
        ;;
    all)
        npx electron-builder --mac --win --linux
        ;;
    *)
        echo "Unknown platform: $PLATFORM"
        echo "Usage: ./build.sh [mac|win|linux|all]"
        exit 1
        ;;
esac

echo "=== Done! ==="
echo "Output files in release/ directory:"
ls -la release/ 2>/dev/null || echo "No release directory found"

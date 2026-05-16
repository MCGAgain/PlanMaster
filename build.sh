#!/bin/bash
# PlanMaster DMG Build Script
# Usage: ./build.sh

set -e

APP_NAME="PlanMaster"
VERSION="1.4.5"
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
DIST_DIR="dist"
BUILD_DIR="build"

echo "=== PlanMaster DMG Builder ==="

# Check dependencies
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found"
    exit 1
fi

# Activate venv
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies
echo "Installing dependencies..."
pip install pyinstaller flask requests pywebview --quiet

# Clean previous builds
rm -rf "$DIST_DIR" "$BUILD_DIR" "*.spec"

# Build with PyInstaller
echo "Building application..."
pyinstaller \
    --name "$APP_NAME" \
    --onedir \
    --windowed \
    --icon icon.icns \
    --add-data "templates:templates" \
    --add-data "static:static" \
    --hidden-import flask \
    --hidden-import sqlite3 \
    --hidden-import webview \
    --hidden-import webview.platforms \
    --hidden-import webview.platforms.cocoa \
    --noconfirm \
    --clean \
    app.py

# Create DMG
echo "Creating DMG..."
if command -v create-dmg &> /dev/null; then
    create-dmg \
        --volname "$APP_NAME" \
        --window-pos 200 120 \
        --window-size 600 400 \
        --icon-size 100 \
        --app-drop-link 425 175 \
        "$DMG_NAME" \
        "$DIST_DIR/"
else
    # Fallback: use hdiutil
    mkdir -p "$DIST_DIR/dmg_temp"
    cp -r "$DIST_DIR/$APP_NAME.app" "$DIST_DIR/dmg_temp/"
    ln -sf /Applications "$DIST_DIR/dmg_temp/Applications"
    hdiutil create -volname "$APP_NAME" \
        -srcfolder "$DIST_DIR/dmg_temp" \
        -ov -format UDZO \
        "$DMG_NAME"
    rm -rf "$DIST_DIR/dmg_temp"
fi

echo "=== Done! ==="
echo "DMG created: $(pwd)/$DMG_NAME"

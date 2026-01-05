#!/bin/bash
# =============================================================================
# PAYSAFE POS APK BUILD & DEPLOY SCRIPT
# =============================================================================
# This script automates the entire APK release process:
# 1. Detects local IP automatically
# 2. Asks for new version (or keeps current)
# 3. Updates pubspec.yaml automatically
# 4. Builds the Flutter APK
# 5. Calculates SHA256 hash
# 6. Copies APK to Next.js public folder
# 7. Updates database with new version info
# =============================================================================

set -e  # Exit on error

# ===== AUTO-DETECT IP ADDRESS =====
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "Detected Network IP: $IP_ADDRESS"

# ===== CONFIGURATION =====
APP_NAME="paysafe_pos"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLUTTER_DIR="$SCRIPT_DIR/../terminal_pos_android"
BACKEND_DIR="$SCRIPT_DIR/../backend-api"
# Use Backend static folder
APK_OUTPUT_DIR="$SCRIPT_DIR/../backend-api/static/apk"
# URL points to Backend API (FastAPI) which serves static files
APK_BASE_URL="http://${IP_ADDRESS}:8000/static/apk"

# =============================================================================
# FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo "=============================================="
    echo "$1"
    echo "=============================================="
}

get_version_from_pubspec() {
    grep "^version:" "$FLUTTER_DIR/pubspec.yaml" | sed 's/version: //' | sed 's/+.*//'
}

get_version_code_from_pubspec() {
    grep "^version:" "$FLUTTER_DIR/pubspec.yaml" | sed 's/.*+//'
}

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_header "PAYSAFE POS APK BUILD & DEPLOY"

# Step 1: Get current version info
echo "[1/6] Reading current version..."
cd "$FLUTTER_DIR"
CURRENT_VERSION=$(get_version_from_pubspec)
CURRENT_CODE=$(get_version_code_from_pubspec)
echo "Current Version: $CURRENT_VERSION+$CURRENT_CODE"
echo ""

# Ask for new version
read -p "Enter NEW version (or press Enter to keep $CURRENT_VERSION): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    VERSION="$CURRENT_VERSION"
    VERSION_CODE="$CURRENT_CODE"
else
    VERSION="$NEW_VERSION"
    VERSION_CODE=$((CURRENT_CODE + 1))
    echo "Updating pubspec.yaml to version $VERSION+$VERSION_CODE..."
    sed -i "s/version: .*/version: $VERSION+$VERSION_CODE/" pubspec.yaml
fi

APK_FILENAME="${APP_NAME}_${VERSION}.apk"
echo ""
echo "Building: $VERSION+$VERSION_CODE"
echo "APK Filename: $APK_FILENAME"

# Step 2: Build APK
print_header "[2/6] Building Release APK"
flutter clean
flutter pub get
flutter build apk --release

# Step 3: Locate and copy APK
print_header "[3/6] Processing APK"
SOURCE_APK="$FLUTTER_DIR/build/app/outputs/flutter-apk/app-release.apk"
DEST_APK="$APK_OUTPUT_DIR/$APK_FILENAME"

if [ ! -f "$SOURCE_APK" ]; then
    echo "ERROR: APK not found at $SOURCE_APK"
    exit 1
fi

# Create output directory if needed
mkdir -p "$APK_OUTPUT_DIR"

# Copy APK
cp "$SOURCE_APK" "$DEST_APK"
echo "APK copied to: $DEST_APK"

# Step 4: Calculate SHA256
print_header "[4/6] Calculating SHA256 Hash"
SHA256=$(sha256sum "$DEST_APK" | awk '{print $1}')
FILE_SIZE=$(stat -c%s "$DEST_APK" 2>/dev/null || stat -f%z "$DEST_APK" 2>/dev/null)
echo "SHA256: $SHA256"
echo "File Size: $FILE_SIZE bytes"

# Step 5: Update database
print_header "[5/6] Updating Database"
APK_URL="${APK_BASE_URL}/${APK_FILENAME}"

echo ""
read -p "Enter minimum required version (press Enter for $VERSION): " MIN_VERSION
if [ -z "$MIN_VERSION" ]; then
    MIN_VERSION="$VERSION"
fi

read -p "Force update for all users? (y/N): " FORCE_UPDATE
if [ "$FORCE_UPDATE" = "y" ] || [ "$FORCE_UPDATE" = "Y" ]; then
    FORCE_UPDATE_VAL=1
else
    FORCE_UPDATE_VAL=0
fi

read -p "Enter release notes: " RELEASE_NOTES

# Use Python script to update database
cd "$BACKEND_DIR"
python3 scripts/update_app_version.py "$VERSION" "$VERSION_CODE" "$MIN_VERSION" "$APK_FILENAME" "$APK_URL" "$SHA256" "$FILE_SIZE" "$RELEASE_NOTES" "$FORCE_UPDATE_VAL"

# Summary
print_header "[6/6] DEPLOYMENT COMPLETE"
echo "Version: $VERSION+$VERSION_CODE"
echo "APK URL: $APK_URL"
echo "SHA256: $SHA256"
echo "Min Required: $MIN_VERSION"
echo "Force Update: $FORCE_UPDATE_VAL"
echo "APK Location: $DEST_APK"
echo ""
echo "POS devices will now receive this update!"

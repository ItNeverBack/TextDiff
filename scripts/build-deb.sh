#!/bin/bash
#
# Build deb package for TextDiff
# This script creates a proper .deb package with dependency management
#

set -e

# Configuration
PACKAGE_NAME="textdiff"
VERSION="1.0.0"
ARCH="amd64"
MAINTAINER="TextDiff Team <support@textdiff.app>"
DESCRIPTION="Professional text comparison tool"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build/deb-build"
SOURCE_DIR="$PROJECT_ROOT/dist/linux-unpacked"
OUTPUT_DIR="$PROJECT_ROOT/dist"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if source directory exists
check_source() {
    if [ ! -d "$SOURCE_DIR" ]; then
        echo -e "${RED}Error: Source directory not found: $SOURCE_DIR${NC}"
        echo "Please build the Linux version first:"
        echo "  npm run build"
        echo "  npm run dist -- --linux"
        exit 1
    fi
}

# Clean and create build directory
prepare_build() {
    echo -e "${YELLOW}Preparing build directory...${NC}"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"
}

# Create debian package structure
create_structure() {
    echo -e "${YELLOW}Creating package structure...${NC}"

    # Create directory structure
    mkdir -p "$BUILD_DIR/DEBIAN"
    mkdir -p "$BUILD_DIR/opt/textdiff"
    mkdir -p "$BUILD_DIR/usr/share/applications"
    mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/256x256/apps"
    mkdir -p "$BUILD_DIR/usr/bin"

    # Copy application files
    echo "Copying application files..."
    cp -r "$SOURCE_DIR/"* "$BUILD_DIR/opt/textdiff/"

    # Copy desktop file
    cp "$SCRIPT_DIR/deb/textdiff.desktop" "$BUILD_DIR/usr/share/applications/"

    # Copy icon (use existing icon or create a link)
    if [ -f "$PROJECT_ROOT/build/icon.png" ]; then
        cp "$PROJECT_ROOT/build/icon.png" "$BUILD_DIR/usr/share/icons/hicolor/256x256/apps/textdiff.png"
    fi

    # Set permissions
    chmod 755 "$BUILD_DIR/DEBIAN"
    chmod 755 "$BUILD_DIR/opt/textdiff"
    chmod 755 "$BUILD_DIR/opt/textdiff/textdiff"
    chmod 4755 "$BUILD_DIR/opt/textdiff/chrome-sandbox" 2>/dev/null || true
}

# Create control file
create_control() {
    echo -e "${YELLOW}Creating control file...${NC}"

    cat > "$BUILD_DIR/DEBIAN/control" << EOF
Package: $PACKAGE_NAME
Version: $VERSION
Section: devel
Priority: optional
Architecture: $ARCH
Depends: libnss3 (>= 2:3.26), libnspr4 (>= 2:4.9), libasound2 (>= 1.0.16), libgtk-3-0 (>= 3.9.10), libnotify4, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Recommends: libgbm1, libx11-xcb1
Suggests: git
Maintainer: $MAINTAINER
Homepage: https://github.com/textdiff/textdiff
Description: $DESCRIPTION
 TextDiff is a powerful text comparison tool for Linux with support for
 file diff, directory diff, and three-way merge. It features a modern UI
 based on Electron and Monaco Editor.
 .
 Features:
  - Side-by-side and unified diff views
  - Directory comparison
  - Three-way merge with conflict resolution
  - Syntax highlighting via Monaco Editor
  - Multiple diff algorithms (Myers, Patience, Histogram)
  - Session management and file watching
EOF

    chmod 644 "$BUILD_DIR/DEBIAN/control"
}

# Create maintainer scripts
create_scripts() {
    echo -e "${YELLOW}Creating maintainer scripts...${NC}"

    # Post-installation script
    cat > "$BUILD_DIR/DEBIAN/postinst" << 'EOF'
#!/bin/bash
set -e

echo "Setting up TextDiff..."

# Create symlink
if [ ! -L /usr/bin/textdiff ]; then
    ln -sf /opt/textdiff/textdiff /usr/bin/textdiff
fi

# Set permissions
chmod 4755 /opt/textdiff/chrome-sandbox 2>/dev/null || true
chmod +x /opt/textdiff/textdiff

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f /usr/share/icons/hicolor 2>/dev/null || true
fi

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications 2>/dev/null || true
fi

# Update mimeapps
if command -v xdg-mime >/dev/null 2>&1; then
    xdg-mime default textdiff.desktop text/plain
    xdg-mime default textdiff.desktop text/x-diff
    xdg-mime default textdiff.desktop text/x-patch
fi

echo "TextDiff has been installed successfully!"
echo "Run 'textdiff' from terminal or find it in your application menu."

exit 0
EOF

    chmod 755 "$BUILD_DIR/DEBIAN/postinst"

    # Pre-removal script
    cat > "$BUILD_DIR/DEBIAN/prerm" << 'EOF'
#!/bin/bash
set -e

# Remove symlink
if [ -L /usr/bin/textdiff ]; then
    rm -f /usr/bin/textdiff
fi

exit 0
EOF

    chmod 755 "$BUILD_DIR/DEBIAN/prerm"

    # Post-removal script
    cat > "$BUILD_DIR/DEBIAN/postrm" << 'EOF'
#!/bin/bash
set -e

# Clean up desktop database
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database /usr/share/applications 2>/dev/null || true
    fi
fi

exit 0
EOF

    chmod 755 "$BUILD_DIR/DEBIAN/postrm"
}

# Create md5sums
create_md5sums() {
    echo -e "${YELLOW}Creating md5sums...${NC}"

    cd "$BUILD_DIR"
    find . -type f ! -path './DEBIAN/*' -exec md5sum {} \; > "$BUILD_DIR/DEBIAN/md5sums"
}

# Build the package
build_package() {
    echo -e "${YELLOW}Building deb package...${NC}"

    mkdir -p "$OUTPUT_DIR"
    OUTPUT_FILE="$OUTPUT_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"

    # Build the package
    dpkg-deb --build "$BUILD_DIR" "$OUTPUT_FILE"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Package built successfully!${NC}"
        echo -e "${GREEN}  Output: $OUTPUT_FILE${NC}"

        # Show package info
        echo ""
        echo "Package information:"
        dpkg-deb -I "$OUTPUT_FILE" | head -20

        # Show file list
        echo ""
        echo "Package contents:"
        dpkg-deb -c "$OUTPUT_FILE" | head -20
        echo "  ... ($(dpkg-deb -c "$OUTPUT_FILE" | wc -l) total files)"
    else
        echo -e "${RED}✗ Package build failed${NC}"
        exit 1
    fi
}

# Verify the package
verify_package() {
    echo ""
    echo -e "${YELLOW}Verifying package...${NC}"

    OUTPUT_FILE="$OUTPUT_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"

    # Check package with lintian if available
    if command -v lintian >/dev/null 2>&1; then
        echo "Running lintian checks..."
        lintian "$OUTPUT_FILE" || true
    else
        echo "lintian not available, skipping lint checks"
    fi

    # Verify dependencies
    echo ""
    echo "Package dependencies:"
    dpkg-deb -f "$OUTPUT_FILE" Depends | tr ',' '\n' | sed 's/^ */  - /'
}

# Clean up
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}Done!${NC}"
}

# Main function
main() {
    echo "========================================"
    echo "Building TextDiff deb package"
    echo "========================================"
    echo ""

    check_source
    prepare_build
    create_structure
    create_control
    create_scripts
    create_md5sums
    build_package
    verify_package
    cleanup

    echo ""
    echo "========================================"
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo "========================================"
    echo ""
    echo "To install the package:"
    echo "  sudo dpkg -i $OUTPUT_FILE"
    echo ""
    echo "Or if dependencies are missing:"
    echo "  sudo apt-get install -f"
}

# Run main function
main "$@"

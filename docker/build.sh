#!/bin/bash

# Build the AI sandbox Docker image
# Usage: ./docker/build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building AI sandbox image..."
docker build \
    -t ai-sandbox:latest \
    -f "$SCRIPT_DIR/Dockerfile.sandbox" \
    "$PROJECT_ROOT"

echo ""
echo "Build complete!"
echo "Image: ai-sandbox:latest"
echo ""
echo "To test, run:"
echo "  docker run -it --rm ai-sandbox:latest bash"
echo ""
echo "Then verify:"
echo "  python3 --version"
echo "  node --version"
echo "  git --version"

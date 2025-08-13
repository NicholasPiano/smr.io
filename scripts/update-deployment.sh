#!/bin/bash

# SMR.io Deployment Update Script
# This script updates the running application on your AWS server with latest code changes

set -e

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Check arguments
FORCE_REFRESH=false
if [ "$1" = "--force-refresh" ]; then
    FORCE_REFRESH=true
    shift
fi

# Check if PUBLIC_IP is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 [--force-refresh] <PUBLIC_IP>"
    print_info "Example: $0 54.123.456.789"
    print_info "Example: $0 --force-refresh 54.123.456.789  (clears all caches)"
    print_info "You can find the PUBLIC_IP in your Terraform outputs:"
    print_info "  cd terraform && terraform output instance_public_ip"
    exit 1
fi

PUBLIC_IP="$1"
SSH_KEY="$HOME/.ssh/smr-io-key"

print_info "🚀 Updating SMR.io deployment on $PUBLIC_IP"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found at $SSH_KEY"
    print_info "Make sure you have the correct SSH key path"
    print_info "If using a different key, update the SSH_KEY variable in this script"
    exit 1
fi

# Ensure local changes are committed
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit them first:"
    print_info "  git add -A && git commit -m 'Your commit message'"
    exit 1
fi

print_info "📤 Pushing local changes to GitHub..."
git push origin main

print_info "🔄 Updating application on server..."

# SSH into server and update
ssh -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" << 'EOF'
    set -e
    
    echo "📁 Navigating to application directory..."
    cd /opt/smr-io/smr.io
    
    echo "🛑 Stopping current services..."
    sudo docker-compose -f docker-compose.prod.yml down
    
    echo "🔄 Switching to main branch..."
    git checkout main
    
    echo "📥 Pulling latest changes..."
    BEFORE_PULL=$(git rev-parse HEAD)
    git pull origin main
    AFTER_PULL=$(git rev-parse HEAD)
    
    # Check if frontend files changed
    FRONTEND_CHANGED=false
    if [ "$BEFORE_PULL" != "$AFTER_PULL" ]; then
        if git diff --name-only $BEFORE_PULL $AFTER_PULL | grep -q "^frontend/"; then
            FRONTEND_CHANGED=true
            echo "🔄 Frontend changes detected - will refresh build cache"
        fi
    fi
    
    echo "🔨 Building and starting updated services..."
    if [ "$FRONTEND_CHANGED" = true ] || [ "$FORCE_REFRESH" = true ]; then
        if [ "$FORCE_REFRESH" = true ]; then
            echo "🧹 Force refresh enabled - cleaning all caches..."
        else
            echo "🧹 Frontend changes detected - cleaning frontend volume..."
        fi
        sudo docker-compose -f docker-compose.prod.yml down
        sudo docker volume rm smrio_frontend_dist 2>/dev/null || echo "Volume already removed or doesn't exist"
        sudo docker-compose -f docker-compose.prod.yml build --no-cache frontend
        sudo docker-compose -f docker-compose.prod.yml up -d
    else
        sudo docker-compose -f docker-compose.prod.yml up -d --build
    fi
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo "🔍 Checking service status..."
    sudo docker-compose -f docker-compose.prod.yml ps
    
    echo "✅ Update complete!"
    
    # Troubleshooting info
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   - If frontend assets seem stale, run: sudo docker volume rm smrio_frontend_dist"
    echo "   - If builds are cached, add --no-cache: sudo docker-compose build --no-cache"
    echo "   - Check container contents: docker exec smr-frontend ls -la /usr/share/nginx/html/assets/"
EOF

if [ $? -eq 0 ]; then
    print_success "🎉 Deployment updated successfully!"
    print_info "Your application should be running with the latest changes"
    print_info "Check your site: https://your-domain.com"
else
    print_error "❌ Update failed. Check the server logs for details."
    exit 1
fi

#!/bin/bash

# SMR.io Production Deployment Script
# This script deploys the SMR.io application to AWS using Terraform

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

print_info "🚀 SMR.io Production Deployment"
print_info "==============================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Please create a .env file with your configuration:"
    print_info "  cp .env.example .env"
    print_info "  # Edit .env with your values"
    exit 1
fi

# Source environment variables
print_info "Loading environment configuration..."
source .env

# Validate required environment variables
required_vars=(
    "DOMAIN_NAME"
    "LETSENCRYPT_EMAIL" 
    "OPENAI_API_KEY"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Environment configuration validated"

# Change to terraform directory
cd terraform

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    print_info "Creating terraform.tfvars from template..."
    cp terraform.tfvars.example terraform.tfvars
    print_warning "Please edit terraform.tfvars with your specific values"
    print_info "Example: allowed_ssh_cidr should be set to your IP address"
    exit 1
fi

# Initialize Terraform
print_info "Initializing Terraform..."
terraform init

# Plan deployment
print_info "Planning deployment..."
terraform plan -out=tfplan

# Ask for confirmation
echo
print_warning "Review the plan above. Do you want to proceed with deployment? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 0
fi

# Apply deployment
print_info "Deploying infrastructure..."
terraform apply tfplan

# Get output values
print_info "Getting deployment information..."
INSTANCE_IP=$(terraform output -raw instance_public_ip)
INSTANCE_DNS=$(terraform output -raw instance_public_dns)
SSH_COMMAND=$(terraform output -raw ssh_command)

print_success "🎉 Deployment completed successfully!"
echo
print_info "📋 Deployment Information:"
print_info "  Public IP: $INSTANCE_IP"
print_info "  Public DNS: $INSTANCE_DNS"
print_info "  SSH Access: $SSH_COMMAND"
echo
print_info "🌐 DNS Configuration:"
terraform output dns_instructions
echo
print_info "⏰ The application is deploying on the server..."
print_info "  - Docker containers are being built and started"
print_info "  - SSL certificates will be obtained automatically"
print_info "  - This process takes 5-10 minutes"
echo
print_info "🔍 To monitor deployment progress:"
print_info "  $SSH_COMMAND"
print_info "  sudo docker logs smr-nginx -f"
echo
print_info "✅ Once complete, your application will be available at:"
print_info "  https://$DOMAIN_NAME"

# Clean up
rm -f tfplan

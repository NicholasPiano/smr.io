#!/bin/bash

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose standalone
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Create application directory
mkdir -p /opt/smr-io
cd /opt/smr-io

# Clone repository
git clone ${github_repo_url} smr.io
cd smr.io

# Create .env file
cat > .env << EOF
# Application Configuration
DOMAIN_NAME=${domain_name}
LETSENCRYPT_EMAIL=${letsencrypt_email}

# API Keys
OPENAI_API_KEY=${openai_api_key}

# AWS Configuration
AWS_ACCESS_KEY_ID=${aws_access_key_id}
AWS_SECRET_ACCESS_KEY=${aws_secret_key}
AWS_DEFAULT_REGION=${aws_region}

# Django Configuration
DEBUG=False
DJANGO_SETTINGS_MODULE=smr_backend.settings
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
ALLOWED_HOSTS=${domain_name},www.${domain_name}

# Database
DATABASE_URL=sqlite:///db.sqlite3
EOF

# Set proper permissions
chown -R ubuntu:ubuntu /opt/smr-io
chmod 600 /opt/smr-io/smr.io/.env

# Create directories for logs and certificates
mkdir -p /opt/smr-io/smr.io/logs/{nginx,certbot}
mkdir -p /var/www/certbot

# Start the application
cd /opt/smr-io/smr.io
docker-compose -f docker-compose.prod.yml up -d --build

# Log deployment completion
echo "$(date): SMR.io deployment completed successfully" >> /var/log/deployment.log
echo "Domain: ${domain_name}" >> /var/log/deployment.log
echo "Application ready at: https://${domain_name}" >> /var/log/deployment.log

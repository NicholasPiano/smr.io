# 🚀 SMR.io Production Deployment Guide

This guide walks you through deploying SMR.io to AWS using Terraform with a production-ready configuration.

## 📋 Prerequisites

### Required Resources
- **AWS Account** with programmatic access
- **Domain name** (e.g., llmsmr.io) with DNS management access
- **OpenAI API key** for text processing functionality

### Local Requirements
- [Terraform](https://terraform.io) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) (optional, for credential management)
- SSH key pair for server access

## 🔧 Setup Process

### 1. Environment Configuration

Create your environment file:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```bash
# Domain Configuration
DOMAIN_NAME=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com

# API Keys  
OPENAI_API_KEY=sk-...

# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=eu-west-2
```

### 2. Terraform Configuration

Configure Terraform variables:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
# AWS Configuration
aws_region                = "eu-west-2"
aws_access_key_id        = "YOUR_AWS_ACCESS_KEY_ID"
aws_secret_access_key    = "YOUR_AWS_SECRET_ACCESS_KEY"

# Domain Configuration  
domain_name              = "your-domain.com"
letsencrypt_email        = "admin@your-domain.com"

# API Keys
openai_api_key          = "sk-..."

# SSH Configuration (IMPORTANT: Restrict to your IP)
ssh_public_key_path     = "~/.ssh/id_rsa.pub"
allowed_ssh_cidr        = "YOUR_IP/32"

# Infrastructure
instance_type           = "t3.medium"
```

### 3. SSH Key Setup

Generate an SSH key if you don't have one:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/smr-io-key -C "smr-io-deployment"
```

Update `terraform.tfvars` to point to your key:
```hcl
ssh_public_key_path = "~/.ssh/smr-io-key.pub"
```

## 🚀 Deployment

### Automated Deployment

Use the deployment script for a guided process:
```bash
./scripts/deploy.sh
```

### Manual Deployment

1. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan the deployment:**
   ```bash
   terraform plan
   ```

3. **Apply the configuration:**
   ```bash
   terraform apply
   ```

4. **Get the server IP:**
   ```bash
   terraform output instance_public_ip
   ```

## 🌐 DNS Configuration

After deployment, configure your DNS:

1. **Get the Elastic IP** from Terraform output
2. **Create A records:**
   - `your-domain.com` → `ELASTIC_IP`
   - `www.your-domain.com` → `ELASTIC_IP`

## 🏗️ Architecture Overview

### Infrastructure Components
- **EC2 Instance** (t3.medium) running Ubuntu 22.04
- **VPC** with public subnet and internet gateway
- **Elastic IP** for consistent IP address
- **Security Group** with HTTP/HTTPS/SSH access
- **EBS Volume** (30GB encrypted) for storage

### Application Stack
- **Nginx** reverse proxy with SSL termination
- **Django** backend API (port 8000)
- **React/Vite** frontend with production build
- **Certbot** for automatic SSL certificate management
- **Docker Compose** for orchestration

### SSL Certificate Flow
1. **Dummy certificates** created during nginx build (prevents startup failures)
2. **Let's Encrypt** certificates obtained via HTTP challenge
3. **Automatic renewal** every 12 hours via certbot daemon
4. **Nginx reload** after certificate updates

## 🔍 Monitoring & Maintenance

### Server Access
```bash
ssh -i ~/.ssh/smr-io-key ubuntu@YOUR_SERVER_IP
```

### View Application Logs
```bash
# All services
sudo docker-compose -f /opt/smr-io/smr.io/docker-compose.prod.yml logs -f

# Specific service
sudo docker logs smr-nginx -f
sudo docker logs smr-backend -f
sudo docker logs smr-certbot -f
```

### Check Service Status
```bash
sudo docker-compose -f /opt/smr-io/smr.io/docker-compose.prod.yml ps
```

### SSL Certificate Status
```bash
sudo docker exec smr-nginx cat /etc/letsencrypt/live/llmsmr.io/fullchain.pem | openssl x509 -noout -dates
```

## 🔄 Updates & Redeployment

### Application Updates
For code changes, simply run:
```bash
terraform apply -refresh-only
```

### Infrastructure Changes
1. Update `terraform.tfvars` or `main.tf`
2. Run `terraform plan` to review changes
3. Run `terraform apply` to implement

### Complete Redeployment
```bash
terraform destroy  # Remove all resources
terraform apply     # Recreate everything
```

## 🛡️ Security Features

### Network Security
- **Security Groups** restrict access to necessary ports only
- **SSH access** limited to specified IP addresses
- **HTTPS enforcement** with automatic HTTP redirects

### SSL/TLS Security
- **TLS 1.2/1.3** protocols only
- **Strong cipher suites** for encryption
- **HSTS headers** for security
- **OCSP stapling** for certificate validation

### Application Security
- **Rate limiting** for API endpoints
- **CORS headers** properly configured
- **Security headers** (X-Frame-Options, X-Content-Type-Options, etc.)
- **Nginx security** configuration

## 📊 Cost Estimation

### Monthly AWS Costs (approximate)
- **EC2 t3.medium**: ~$30/month
- **EBS 30GB**: ~$3/month  
- **Elastic IP**: ~$3.60/month (if not attached to running instance)
- **Data Transfer**: Variable based on usage

**Total**: ~$35-40/month

## 🔧 Troubleshooting

### Common Issues

**SSL Certificate Failed:**
```bash
# Check nginx logs
sudo docker logs smr-nginx

# Check certbot logs  
sudo docker logs smr-certbot

# Manually retry certificate
sudo docker exec smr-certbot certbot renew --dry-run
```

**Application Not Loading:**
```bash
# Check all service status
sudo docker-compose -f /opt/smr-io/smr.io/docker-compose.prod.yml ps

# Restart services
sudo docker-compose -f /opt/smr-io/smr.io/docker-compose.prod.yml restart
```

**DNS Issues:**
- Verify A records point to correct IP
- Check propagation: `dig your-domain.com`
- Wait 24-48 hours for full DNS propagation

### Support Resources
- **Terraform Documentation**: https://terraform.io/docs
- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/

## 🧹 Cleanup

To completely remove all AWS resources:
```bash
cd terraform
terraform destroy
```

**Warning**: This will permanently delete all data and resources!

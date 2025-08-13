# Deployment Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue: Frontend Assets Not Updating After Deployment

**Symptoms:**
- New code deployed but website shows old content
- Logo/images missing after adding them to codebase
- JavaScript bundles have old hashes
- Container restart doesn't fix the issue

**Root Cause:**
Docker persistent volumes (`frontend_dist`) cache old build artifacts and override new container content.

**Solutions:**

#### 1. Automatic Detection (Recommended)
The deployment script now automatically detects frontend changes and cleans volumes:
```bash
./scripts/update-deployment.sh <PUBLIC_IP>
```

#### 2. Force Refresh
Use the force refresh flag to clear all caches:
```bash
./scripts/update-deployment.sh --force-refresh <PUBLIC_IP>
```

#### 3. Manual Volume Cleanup
If automatic detection fails:
```bash
# SSH into server
ssh -i ~/.ssh/smr-io-key ubuntu@<PUBLIC_IP>

# Stop services and remove volume
cd /opt/smr-io/smr.io
sudo docker-compose -f docker-compose.prod.yml down
sudo docker volume rm smrio_frontend_dist

# Rebuild without cache
sudo docker-compose -f docker-compose.prod.yml build --no-cache frontend
sudo docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Diagnostic Commands

### Check Container Contents
```bash
# Verify what files are actually in the container
docker exec smr-frontend ls -la /usr/share/nginx/html/assets/

# Check HTML being served
docker exec smr-frontend cat /usr/share/nginx/html/index.html
```

### Check Image vs Container
```bash
# Check what the image contains (should have latest build)
docker run --rm smrio-frontend:latest ls -la /usr/share/nginx/html/assets/

# Compare with running container (might be different due to volume mount)
docker exec smr-frontend ls -la /usr/share/nginx/html/assets/
```

### Verify Website Assets
```bash
# Check what the website is serving
curl -s https://your-domain.com/ | grep -E 'index-|vendor-|utils-'

# Check if specific assets are accessible
curl -I https://your-domain.com/assets/icon-HASH.svg
```

### Check Volume Mounts
```bash
# See what volumes are mounted
docker inspect smr-frontend | grep -A 10 "Mounts"

# List all volumes
docker volume ls | grep smrio
```

## 🛠️ Prevention Measures

### 1. Updated Deployment Script
The deployment script now includes:
- **Automatic frontend change detection** using git diff
- **Smart volume cleanup** when frontend files change
- **Force refresh option** for manual cache clearing
- **Troubleshooting hints** in output

### 2. Volume Management Strategy
- **Development**: Keep volumes for faster rebuilds
- **Production**: Clean volumes when frontend changes detected
- **Emergency**: Use `--force-refresh` to clear everything

### 3. Monitoring
- Check asset hashes match between build output and website
- Verify container creation timestamps
- Monitor for volume mount conflicts

## 📋 Deployment Checklist

Before deployment:
- [ ] Check if frontend files changed: `git diff --name-only HEAD~1 HEAD | grep frontend`
- [ ] Note current asset hashes on live site
- [ ] Have SSH access ready for troubleshooting

After deployment:
- [ ] Verify new asset hashes are served
- [ ] Test that new features/assets are visible
- [ ] Check container logs for errors: `docker logs smr-frontend`

Emergency rollback:
- [ ] Keep previous git commit hash
- [ ] Know how to quickly revert: `git reset --hard <previous-commit>`
- [ ] Have backup of working Docker images

## 🔧 Advanced Troubleshooting

### Docker Compose Volume Issue
If the volume keeps recreating with old data:
```bash
# Remove all related containers and volumes
sudo docker-compose -f docker-compose.prod.yml down -v
sudo docker system prune -f
sudo docker volume prune -f

# Rebuild everything fresh
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d
```

### Nginx Caching
If nginx is caching old content:
```bash
# Restart nginx container
docker restart smr-nginx

# Or reload nginx config
docker exec smr-nginx nginx -s reload
```

### Build Cache Issues
If Docker build cache is problematic:
```bash
# Clear all build cache
sudo docker builder prune -af

# Rebuild with no cache
sudo docker-compose build --no-cache --pull
```

## 📞 Emergency Contacts

- **Server Access**: SSH key at `~/.ssh/smr-io-key`
- **Domain**: Check DNS at your domain registrar
- **SSL**: Certificates managed by certbot containers
- **Logs**: Available in `./logs/` directory on server

## 📚 Related Files

- `docker-compose.prod.yml` - Production container configuration
- `scripts/update-deployment.sh` - Deployment automation
- `frontend/Dockerfile` - Frontend build configuration
- `.env` - Environment variables (not in git)

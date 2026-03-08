# Ephemeris API - Docker Deployment Guide

Complete guide for deploying the Ephemeris API with Docker.

---

## 🚀 Quick Start (Local Testing)

```bash
# Build and run
docker-compose -f docker-compose.ephemeris.yml up -d

# Check status
docker-compose -f docker-compose.ephemeris.yml ps

# View logs
docker-compose -f docker-compose.ephemeris.yml logs -f

# Test the API
curl http://localhost:8000/health
curl "http://localhost:8000/api/v1/ephemeris/moon-phase?latitude=55.7558&longitude=37.6173"
```

---

## 📦 Production Deployment

### Option 1: Simple Single Server

**Best for**: Small to medium traffic, single server deployment

```bash
# 1. Clone repository on server
git clone your-repo.git
cd lunar-calendar-api

# 2. Build and start
docker-compose -f docker-compose.ephemeris.yml up -d

# 3. Verify
curl http://localhost:8000/health
```

**Resource Requirements**:
- **CPU**: 0.5-1 core
- **RAM**: 256-512MB
- **Disk**: 500MB
- **Cost**: $6-12/month (DigitalOcean, Linode)

---

### Option 2: With Nginx Reverse Proxy

**Best for**: Production with SSL, custom domain, rate limiting

```bash
# 1. Update nginx.conf with your domain
nano nginx.conf
# Change: server_name your-domain.com;

# 2. Add SSL certificates (Let's Encrypt recommended)
mkdir ssl
# Copy cert.pem and key.pem to ssl/

# 3. Start with Nginx
docker-compose -f docker-compose.ephemeris.yml up -d

# 4. Access via domain
curl https://your-domain.com/health
```

---

### Option 3: AWS/GCP/Azure Cloud Deployment

#### **AWS Elastic Container Service (ECS)**

```bash
# 1. Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL

docker build -f Dockerfile.ephemeris -t ephemeris-api .
docker tag ephemeris-api:latest YOUR_ECR_URL/ephemeris-api:latest
docker push YOUR_ECR_URL/ephemeris-api:latest

# 2. Create ECS task definition (use docker-compose.ephemeris.yml as reference)
# 3. Deploy to ECS Fargate
```

**Cost Estimate**: $15-30/month (Fargate)

---

#### **Google Cloud Run** (Serverless - Recommended for Auto-scaling)

```bash
# 1. Build and push to GCR
gcloud builds submit --tag gcr.io/YOUR_PROJECT/ephemeris-api

# 2. Deploy to Cloud Run
gcloud run deploy ephemeris-api \
  --image gcr.io/YOUR_PROJECT/ephemeris-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

**Cost**: Pay-per-use, ~$5-20/month for moderate traffic

---

#### **Azure Container Instances**

```bash
# 1. Push to Azure Container Registry
az acr build --registry YOUR_ACR --image ephemeris-api .

# 2. Deploy
az container create \
  --resource-group YOUR_RG \
  --name ephemeris-api \
  --image YOUR_ACR.azurecr.io/ephemeris-api:latest \
  --cpu 1 --memory 0.5 \
  --ports 8000
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=false

# Project Info
PROJECT_NAME=Lunar Calendar & Ephemeris API
VERSION=1.0.0
API_V1_PREFIX=/api/v1

# Performance
WORKERS=2  # Number of Uvicorn workers (2-4 recommended)

# Optional: External services
# REDIS_URL=redis://redis:6379/0  # For distributed caching
```

### Worker Configuration

**How many workers?**
- **Small server (1 CPU)**: 2 workers
- **Medium server (2-4 CPU)**: 4 workers
- **Large server (8+ CPU)**: 8-16 workers

Update in `docker-compose.ephemeris.yml`:
```yaml
environment:
  - WORKERS=4
```

Or in Dockerfile.ephemeris:
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

---

## 🔒 Security Best Practices

### 1. Use Non-Root User ✅
Already configured in Dockerfile.ephemeris

### 2. Enable Rate Limiting ✅
Configured in nginx.conf (10 req/sec with burst of 20)

### 3. Add SSL/TLS
```bash
# Using Let's Encrypt (recommended)
certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Uncomment SSL lines in nginx.conf
```

### 4. Firewall Rules
```bash
# Only allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 5. API Key Authentication (Optional)

Add to `app/api/v1/ephemeris.py`:
```python
from fastapi import Header, HTTPException

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != os.getenv("API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")

# Add to endpoints
@router.get("/planets", dependencies=[Depends(verify_api_key)])
async def get_planet_positions(...):
    ...
```

---

## 📊 Monitoring & Logging

### View Logs

```bash
# Real-time logs
docker-compose -f docker-compose.ephemeris.yml logs -f ephemeris-api

# Last 100 lines
docker-compose -f docker-compose.ephemeris.yml logs --tail=100 ephemeris-api
```

### Health Checks

```bash
# Manual check
curl http://localhost:8000/health

# Docker health status
docker ps
# Look for "healthy" status
```

### Performance Monitoring

```bash
# Container stats
docker stats ephemeris-api

# Cache statistics
curl http://localhost:8000/api/v1/ephemeris/cache/stats
```

---

## 🔄 Updates & Maintenance

### Update Deployment

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart
docker-compose -f docker-compose.ephemeris.yml up -d --build

# 3. Verify
curl http://localhost:8000/health
```

### Zero-Downtime Updates

```bash
# 1. Start new version on different port
docker-compose -f docker-compose.ephemeris.yml up -d --scale ephemeris-api=2

# 2. Update Nginx to point to new containers
# 3. Stop old containers
```

### Backup

```bash
# Backup ephemeris cache (optional)
docker volume ls
docker run --rm -v ephemeris-cache:/data -v $(pwd):/backup \
  alpine tar czf /backup/ephemeris-cache-backup.tar.gz -C /data .
```

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.ephemeris.yml logs ephemeris-api

# Common issues:
# 1. Port already in use
sudo lsof -i :8000  # Kill process or change port

# 2. Missing dependencies
docker-compose -f docker-compose.ephemeris.yml build --no-cache
```

### High memory usage

```bash
# Check stats
docker stats ephemeris-api

# Solution: Clear cache
curl -X POST http://localhost:8000/api/v1/ephemeris/cache/clear

# Or reduce workers in docker-compose.ephemeris.yml
```

### Slow responses

```bash
# 1. Check if cached
curl http://localhost:8000/api/v1/ephemeris/cache/stats

# 2. Increase workers
# Edit docker-compose.ephemeris.yml: WORKERS=4

# 3. Add more CPU/RAM
# Edit docker-compose.ephemeris.yml deploy.resources
```

---

## 💰 Cost Estimates

### Small Deployment (Low Traffic)
- **Provider**: DigitalOcean Droplet ($6/month)
- **Specs**: 1 CPU, 1GB RAM
- **Capacity**: ~100 req/min
- **Total**: **$6-10/month**

### Medium Deployment (Moderate Traffic)
- **Provider**: DigitalOcean ($12/month) or AWS Fargate
- **Specs**: 2 CPU, 2GB RAM
- **Capacity**: ~500 req/min
- **Total**: **$15-25/month**

### Large Deployment (High Traffic)
- **Provider**: AWS ECS / Google Cloud Run (auto-scaling)
- **Specs**: Auto-scale 1-10 instances
- **Capacity**: 1000s req/min
- **Total**: **$50-200/month** (usage-based)

---

## ✅ Production Checklist

Before going live:

- [ ] SSL/TLS certificates configured
- [ ] Domain name pointed to server
- [ ] Rate limiting enabled (nginx.conf)
- [ ] Health checks working
- [ ] Logs configured and accessible
- [ ] Backups automated
- [ ] Monitoring setup (optional: Prometheus, Grafana)
- [ ] API key authentication (if needed)
- [ ] Firewall rules configured
- [ ] Documentation updated with your domain

---

## 🎯 Recommended Setup for Most Users

**DigitalOcean Droplet + Docker Compose + Nginx**

1. **Create $6/month droplet** (Ubuntu 22.04)
2. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```
3. **Deploy**:
   ```bash
   git clone your-repo.git
   cd lunar-calendar-api
   docker-compose -f docker-compose.ephemeris.yml up -d
   ```
4. **Add SSL** (Let's Encrypt - free)
5. **Done!** 🎉

**Total time**: ~15 minutes
**Total cost**: $6/month

---

## 📚 Additional Resources

- Docker docs: https://docs.docker.com/
- Uvicorn deployment: https://www.uvicorn.org/deployment/
- Nginx: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/

---

**Questions?** Check the main README or open an issue!

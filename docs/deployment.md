# Deployment Guide

This guide covers deploying the Adaptive Astro Scheduler application.

## Quick Start with Docker

The easiest way to deploy the application is using Docker Compose:

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Steps

1. Clone the repository:
```bash
git clone https://github.com/thelonius/adaptive-astro-scheduler.git
cd adaptive-astro-scheduler
```

2. Create environment file:
```bash
cp packages/backend/.env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. Start the application:
```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- Backend API on port 3001
- Frontend on port 80

4. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Manual Deployment

### Backend Deployment

#### Prerequisites
- Node.js 18+
- MongoDB instance
- OpenAI API key

#### Steps

1. Install dependencies:
```bash
cd packages/backend
npm install
```

2. Create `.env` file:
```bash
PORT=3001
NODE_ENV=production
MONGO_URI=mongodb://your-mongodb-host:27017/adaptive-astro
OPENAI_API_KEY=your_openai_api_key
LOG_LEVEL=info
CORS_ORIGIN=https://your-frontend-domain.com
```

3. Build:
```bash
npm run build
```

4. Start:
```bash
npm start
```

Or use PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name adaptive-astro-backend
```

### Frontend Deployment

#### Option 1: Static Hosting (Recommended)

Build and deploy to any static hosting service:

```bash
cd packages/frontend
npm install
npm run build
```

Upload the `dist` folder to:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages
- Cloudflare Pages

Don't forget to set the environment variable:
```
VITE_API_URL=https://your-backend-api-url.com/api
```

#### Option 2: Nginx

1. Build the frontend:
```bash
cd packages/frontend
npm run build
```

2. Configure Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/packages/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend-server:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Restart Nginx:
```bash
sudo systemctl restart nginx
```

## Cloud Deployments

### AWS Deployment

#### Backend on Elastic Beanstalk

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize:
```bash
cd packages/backend
eb init
```

3. Create environment:
```bash
eb create production
```

4. Set environment variables:
```bash
eb setenv MONGO_URI=mongodb://... OPENAI_API_KEY=...
```

5. Deploy:
```bash
eb deploy
```

#### Frontend on S3 + CloudFront

1. Build:
```bash
cd packages/frontend
npm run build
```

2. Upload to S3:
```bash
aws s3 sync dist/ s3://your-bucket-name
```

3. Create CloudFront distribution pointing to the S3 bucket

### Heroku Deployment

#### Backend

1. Create Heroku app:
```bash
heroku create your-app-name
```

2. Add MongoDB:
```bash
heroku addons:create mongolab:sandbox
```

3. Set config vars:
```bash
heroku config:set OPENAI_API_KEY=your_key
heroku config:set NODE_ENV=production
```

4. Deploy:
```bash
git subtree push --prefix packages/backend heroku main
```

#### Frontend

Use Heroku's static buildpack or deploy to Netlify/Vercel instead.

### Digital Ocean

#### Using App Platform

1. Connect your GitHub repository
2. Configure build settings:
   - Backend:
     - Build Command: `cd packages/backend && npm install && npm run build`
     - Run Command: `cd packages/backend && npm start`
   - Frontend:
     - Build Command: `cd packages/frontend && npm install && npm run build`
     - Output Directory: `packages/frontend/dist`

3. Add environment variables in the dashboard

### Railway.app

1. Create new project
2. Add MongoDB service
3. Add backend service:
   - Root Directory: `packages/backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add frontend service:
   - Root Directory: `packages/frontend`
   - Build Command: `npm install && npm run build`
   - Deploy from `dist` folder

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- kubectl configured
- Container registry access

### Steps

1. Build and push Docker images:
```bash
docker build -f packages/backend/Dockerfile -t your-registry/adaptive-astro-backend:latest .
docker push your-registry/adaptive-astro-backend:latest

docker build -f packages/frontend/Dockerfile -t your-registry/adaptive-astro-frontend:latest .
docker push your-registry/adaptive-astro-frontend:latest
```

2. Create Kubernetes manifests:

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/adaptive-astro-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongo-uri
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: openai-key
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 3001
    targetPort: 3001
```

**frontend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/adaptive-astro-frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

3. Create secrets:
```bash
kubectl create secret generic app-secrets \
  --from-literal=mongo-uri='mongodb://...' \
  --from-literal=openai-key='sk-...'
```

4. Deploy:
```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

## Environment Variables

### Backend Required Variables

```env
PORT=3001                          # Server port
NODE_ENV=production                # Environment
MONGO_URI=mongodb://...           # MongoDB connection string
OPENAI_API_KEY=sk-...             # OpenAI API key
LOG_LEVEL=info                     # Logging level
CORS_ORIGIN=https://...           # Frontend URL
```

### Frontend Required Variables

```env
VITE_API_URL=https://.../api      # Backend API URL
```

## Monitoring and Logging

### Logging

Logs are stored in `packages/backend/logs/`:
- `error.log` - Error logs only
- `combined.log` - All logs

In production, consider:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic
- Papertrail

### Monitoring

Health check endpoint: `GET /health`

Set up monitoring with:
- UptimeRobot
- Pingdom
- AWS CloudWatch
- Datadog
- Prometheus + Grafana

### Error Tracking

Integrate Sentry for error tracking:

```bash
npm install @sentry/node
```

Add to `packages/backend/src/index.ts`:
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## Database Backups

### MongoDB Backups

#### Automated Backups

Create a backup script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://..." --out="/backups/backup_$DATE"
```

Schedule with cron:
```bash
0 2 * * * /path/to/backup.sh
```

#### MongoDB Atlas

If using MongoDB Atlas, backups are automatic.

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Enable SSL/TLS (Full or Full Strict)
3. Update DNS records

## Performance Optimization

### Backend

1. Enable compression:
```typescript
import compression from 'compression';
app.use(compression());
```

2. Add rate limiting:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

3. Use Redis for caching:
```bash
npm install redis
```

### Frontend

1. Enable code splitting in Vite
2. Optimize images
3. Use CDN for static assets
4. Enable browser caching

## Troubleshooting

### Backend won't start

1. Check MongoDB connection:
```bash
mongosh "mongodb://your-uri"
```

2. Check logs:
```bash
tail -f packages/backend/logs/error.log
```

3. Verify environment variables:
```bash
printenv | grep MONGO_URI
```

### Frontend not connecting to backend

1. Check CORS settings in backend
2. Verify API URL in frontend `.env`
3. Check network tab in browser DevTools

### Database connection errors

1. Check MongoDB is running
2. Verify connection string format
3. Check firewall rules
4. Verify credentials

## Security Checklist

- [ ] Environment variables properly set
- [ ] API keys not committed to git
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] MongoDB authentication enabled
- [ ] Regular security updates
- [ ] Monitoring and alerting set up
- [ ] Backups configured

## Scaling

### Horizontal Scaling

1. Use load balancer (AWS ELB, Nginx, HAProxy)
2. Run multiple backend instances
3. Use Redis for session management
4. Database read replicas

### Vertical Scaling

1. Increase server resources
2. Optimize database queries
3. Add database indexes
4. Use connection pooling

## Cost Optimization

### Free/Low-Cost Options

- **Backend**: Railway.app free tier, Heroku hobby tier
- **Frontend**: Netlify free tier, Vercel free tier, GitHub Pages
- **Database**: MongoDB Atlas free tier (512MB)
- **Monitoring**: UptimeRobot free tier

### Production Options

- **Backend**: DigitalOcean ($6/month), AWS Lightsail ($10/month)
- **Frontend**: Cloudflare Pages (free), Netlify Pro ($19/month)
- **Database**: MongoDB Atlas ($9/month), DigitalOcean Managed MongoDB ($15/month)

---

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review logs
3. Open an issue on GitHub

**Last Updated:** January 2026

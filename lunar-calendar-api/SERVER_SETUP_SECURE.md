# Secure Server Setup & Deployment Plan

**Server IP**: 91.84.112.120
**Status**: ⚠️ ROOT PASSWORD EXPOSED - Must be changed immediately

---

## 🚨 STEP 0: EMERGENCY SECURITY (DO THIS FIRST!)

### Change Root Password NOW

```bash
# SSH into server
ssh root@91.84.112.120

# Change password immediately
passwd
# Enter NEW strong password (use password generator!)
```

**Generate strong password**: https://passwordsgenerator.net/ (20+ characters)

---

## 🔒 STEP 1: Initial Server Security (15 minutes)

### 1.1 Update System

```bash
# Update package list
apt update

# Upgrade all packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git ufw fail2ban
```

### 1.2 Create Non-Root User

```bash
# Create deployment user
adduser deployer
# Set strong password when prompted

# Add to sudo group
usermod -aG sudo deployer

# Switch to new user
su - deployer
```

### 1.3 Setup SSH Key Authentication (Recommended)

**On YOUR local machine** (not the server):

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter to accept default location
# Set a passphrase (optional but recommended)

# Copy public key to server
ssh-copy-id deployer@91.84.112.120
# Enter deployer password
```

**Test SSH key login**:
```bash
ssh deployer@91.84.112.120
# Should login without password!
```

### 1.4 Disable Root SSH Login & Password Authentication

**On the server** as deployer:

```bash
sudo nano /etc/ssh/sshd_config
```

**Change these lines**:
```
PermitRootLogin no              # Disable root login
PasswordAuthentication no       # Only allow SSH keys
PubkeyAuthentication yes        # Enable SSH keys
```

**Restart SSH**:
```bash
sudo systemctl restart sshd
```

⚠️ **BEFORE YOU CLOSE YOUR CURRENT SSH SESSION**: Open a NEW terminal and test that you can still login!

```bash
# From your local machine
ssh deployer@91.84.112.120
# Should work with SSH key!
```

### 1.5 Setup Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
# Type 'y' to confirm

# Check status
sudo ufw status
```

### 1.6 Setup Fail2Ban (Protection against brute-force)

```bash
# Install fail2ban (already done in 1.1)
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

---

## 🐳 STEP 2: Install Docker (10 minutes)

### 2.1 Install Docker Engine

```bash
# Install Docker (automated script)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add deployer to docker group
sudo usermod -aG docker deployer

# Apply group changes (logout and login again)
exit
ssh deployer@91.84.112.120

# Test Docker
docker --version
docker run hello-world
```

### 2.2 Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Test
docker-compose --version
```

---

## 📦 STEP 3: Deploy Application (15 minutes)

### 3.1 Clone Repository

```bash
# Create app directory
mkdir -p ~/apps
cd ~/apps

# Clone repository
git clone https://github.com/YOUR-USERNAME/lunar-calendar-api.git
cd lunar-calendar-api
```

**OR** upload files manually:

```bash
# On your local machine
scp -r /path/to/lunar-calendar-api deployer@91.84.112.120:~/apps/
```

### 3.2 Configure Environment

```bash
# Create .env file
nano .env
```

**Add this content**:
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
WORKERS=2

# Security (optional - add API key protection)
# API_KEY=your-secret-api-key-here
```

### 3.3 Build and Start

```bash
# Build Docker image
docker-compose -f docker-compose.ephemeris.yml build

# Start services
docker-compose -f docker-compose.ephemeris.yml up -d

# Check status
docker-compose -f docker-compose.ephemeris.yml ps

# View logs
docker-compose -f docker-compose.ephemeris.yml logs -f
```

### 3.4 Test Deployment

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test moon phase endpoint
curl "http://localhost:8000/api/v1/ephemeris/moon-phase?latitude=55.7558&longitude=37.6173"
```

---

## 🌐 STEP 4: Setup Domain & SSL (20 minutes)

### Option A: With Custom Domain (Recommended)

#### 4.1 Point Domain to Server

**In your domain registrar (e.g., Namecheap, GoDaddy)**:

Create A record:
```
Type: A
Name: @ (or api)
Value: 91.84.112.120
TTL: 300
```

Wait 5-10 minutes for DNS propagation.

#### 4.2 Install SSL Certificate (Let's Encrypt - FREE)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates saved to:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### 4.3 Configure Nginx with SSL

```bash
# Update nginx.conf
cd ~/apps/lunar-calendar-api
nano nginx.conf
```

**Update these lines**:
```nginx
server_name your-domain.com;  # Change this

# Uncomment SSL lines:
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

**Create SSL volume mount**:

Edit `docker-compose.ephemeris.yml`:
```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Add this line
```

**Restart services**:
```bash
docker-compose -f docker-compose.ephemeris.yml down
docker-compose -f docker-compose.ephemeris.yml up -d
```

#### 4.4 Setup Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job
# Certificates renew automatically every 90 days
```

### Option B: Without Domain (IP Only)

Skip SSL setup, access via:
```
http://91.84.112.120/api/v1/ephemeris/moon-phase
```

⚠️ **Not recommended for production** - no encryption, no HTTPS.

---

## ✅ STEP 5: Verify Everything Works

### 5.1 Test Endpoints

```bash
# From your local machine
curl https://your-domain.com/health

curl "https://your-domain.com/api/v1/ephemeris/moon-phase?latitude=55.7558&longitude=37.6173"

curl "https://your-domain.com/api/v1/ephemeris/planets?latitude=55.7558&longitude=37.6173"
```

### 5.2 Check Docker Status

```bash
# SSH to server
ssh deployer@91.84.112.120

# Check containers
docker ps

# Check logs
docker-compose -f ~/apps/lunar-calendar-api/docker-compose.ephemeris.yml logs --tail=50

# Check resources
docker stats
```

### 5.3 Test API Documentation

Open in browser:
```
https://your-domain.com/docs
```

---

## 📊 STEP 6: Monitoring & Maintenance

### 6.1 Setup Log Rotation

```bash
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

### 6.2 Schedule Cache Cleanup (Optional)

```bash
# Add cron job
crontab -e
```

Add this line (clears cache daily at 3 AM):
```
0 3 * * * curl -X POST http://localhost:8000/api/v1/ephemeris/cache/clear
```

### 6.3 Monitor Server Resources

```bash
# Install monitoring tools
sudo apt install -y htop ncdu

# Check CPU/RAM
htop

# Check disk usage
df -h
ncdu /
```

---

## 🔄 STEP 7: Updates & Backups

### Update Application

```bash
# SSH to server
ssh deployer@91.84.112.120

# Navigate to app
cd ~/apps/lunar-calendar-api

# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.ephemeris.yml up -d --build

# Verify
curl http://localhost:8000/health
```

### Backup Strategy

```bash
# Backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deployer/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm -v ephemeris-cache:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/cache-$DATE.tar.gz -C /data .

# Backup app config
tar czf $BACKUP_DIR/config-$DATE.tar.gz -C /home/deployer/apps/lunar-calendar-api .env

# Keep only last 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x ~/backup.sh

# Schedule weekly backups
crontab -e
# Add: 0 2 * * 0 /home/deployer/backup.sh
```

---

## 🔐 Security Checklist

Before going live, verify:

- [x] Root password changed
- [x] Non-root user created (deployer)
- [x] SSH key authentication enabled
- [x] Password authentication disabled
- [x] Root SSH login disabled
- [x] Firewall enabled (ufw)
- [x] Fail2Ban installed and running
- [x] SSL/TLS certificate installed
- [x] Docker running as non-root user
- [x] Application using .env for secrets
- [x] Rate limiting enabled (nginx)
- [x] Log rotation configured
- [x] Backups scheduled

---

## 📋 Quick Reference

### Server Access
```bash
ssh deployer@91.84.112.120
```

### Application Control
```bash
# Start
docker-compose -f docker-compose.ephemeris.yml up -d

# Stop
docker-compose -f docker-compose.ephemeris.yml down

# Restart
docker-compose -f docker-compose.ephemeris.yml restart

# Logs
docker-compose -f docker-compose.ephemeris.yml logs -f

# Stats
docker stats
```

### Troubleshooting
```bash
# Check firewall
sudo ufw status

# Check SSL certificate
sudo certbot certificates

# Check Nginx logs
docker-compose -f docker-compose.ephemeris.yml logs nginx

# Check API logs
docker-compose -f docker-compose.ephemeris.yml logs ephemeris-api

# Restart everything
docker-compose -f docker-compose.ephemeris.yml down
docker-compose -f docker-compose.ephemeris.yml up -d
```

---

## 💰 Estimated Costs

- **Server**: ~$5-20/month (depending on provider)
- **Domain**: ~$10-15/year (optional)
- **SSL**: FREE (Let's Encrypt)
- **Total**: ~$5-20/month

---

## 📞 Next Steps After Deployment

1. Test all endpoints thoroughly
2. Set up monitoring (optional: UptimeRobot, Pingdom)
3. Document your API for users
4. Set up analytics (optional)
5. Plan for scaling if traffic grows

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER share credentials publicly** again
2. Always use SSH keys, not passwords
3. Keep system updated (`sudo apt update && sudo apt upgrade`)
4. Monitor logs regularly
5. Test backups periodically
6. Renew SSL certificates (automatic with Let's Encrypt)

---

**Ready to deploy?** Follow steps 0-7 in order. Estimated total time: **1-2 hours**

Good luck! 🚀

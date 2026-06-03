# 🚀 Deployment Guide - Reservation Safari

Complete guide for deploying Reservation Safari to production.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Local Development

### Prerequisites

- **Node.js 18+**
- **npm** or **yarn**

### Setup

```bash
# Clone repository
git clone <your-repo-url>
cd reservation-safari

# Run setup script
bash scripts/setup.sh

# Or manually:
npm install
npm install --prefix server
cp .env.example .env.local
cp server/.env.example server/.env
mkdir -p server/uploads
```

### Running Locally

**Terminal 1: Start backend**
```bash
npm run server
```
Backend will run on `http://localhost:3001`

**Terminal 2: Start frontend**
```bash
npm run dev
```
Frontend will run on `http://localhost:5173`

### Environment Variables

Update `.env.local` and `server/.env` with your configuration:

```bash
# Required for production
JWT_SECRET=<your-secret-key>
WEBHOOK_SECRET=<your-webhook-secret>
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Base44 Integration
VITE_BASE44_APP_ID=<your-app-id>
VITE_BASE44_APP_BASE_URL=https://your-domain.base44.app

# Email (Gmail with App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=<your-app-password>

# SMS/Notifications (Optional)
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Docker Deployment

### Prerequisites

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)

### Quick Start

```bash
# 1. Create environment file
cp .env.example .env.production
# Edit .env.production with your settings

# 2. Deploy
bash scripts/deploy.sh production

# 3. Verify
bash scripts/health-check.sh
```

### Manual Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# View status
docker-compose ps

# Stop services
docker-compose down

# Access containers
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Docker Environment Variables

All variables are loaded from `.env` file. Key variables:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<secure-random-string>
WEBHOOK_SECRET=<secure-random-string>
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

BACKEND_PORT=3001
FRONTEND_PORT=3000
```

---

## Cloud Deployment

### AWS EC2 / DigitalOcean / Linode

#### Step 1: Provision Server

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose

# Create app directory
mkdir -p ~/safari-app && cd ~/safari-app
```

#### Step 2: Deploy Application

```bash
# Copy files to server (from local)
scp -r . root@your-server-ip:~/safari-app/

# SSH into server
ssh root@your-server-ip
cd ~/safari-app

# Create environment file
cp .env.example .env.production
nano .env.production  # Edit with your configuration

# Deploy with script
bash scripts/deploy.sh production

# Or manually:
docker-compose -f docker-compose.yml up -d
```

#### Step 3: Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
apt install -y nginx

# Create config
cat > /etc/nginx/sites-available/safari << 'EOF'
upstream backend {
    server localhost:3001;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/safari /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### Step 4: Setup SSL with Let's Encrypt

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
systemctl enable certbot.timer
```

### GitHub Actions CI/CD

Automatic deployment on push to `main`:

```bash
# 1. Add secrets to GitHub repository settings:
DOCKER_USERNAME=<your-docker-username>
DOCKER_PASSWORD=<your-docker-token>
DEPLOY_HOST=<your-server-ip>
DEPLOY_USER=root
DEPLOY_KEY=<your-ssh-private-key>

# 2. Push to main branch
git push origin main

# GitHub Actions will:
# - Run tests & linting
# - Build Docker images
# - Push to Docker Hub
# - Deploy to your server
```

### Render.com

```bash
# 1. Create two services on Render:

# Backend Service:
- Name: safari-backend
- Runtime: Docker
- Dockerfile: ./Dockerfile.backend
- Environment: Add from .env.example
- Port: 3001

# Frontend Service:
- Name: safari-frontend
- Runtime: Docker
- Dockerfile: ./Dockerfile.frontend
- Environment: Add from .env.example
- Port: 3000

# 2. Deploy by pushing to GitHub
git push origin main
```

### Railway.app

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Link project
railway link <project-id>

# 3. Configure environment
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=<your-secret>
# ... add other variables

# 4. Deploy
railway up
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check service status
bash scripts/health-check.sh

# Or manually:
curl http://localhost:3001/health
curl http://localhost:3000
```

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# All logs
docker-compose logs -f
```

### Backup Data

```bash
# Backup database file
docker-compose exec -T backend cp /app/data.json /app/backups/data-$(date +%s).json

# Backup uploads
docker cp safari-backend:/app/uploads ./backups/
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Verify
bash scripts/health-check.sh
```

### Performance Optimization

1. **Enable Gzip compression** in Nginx:
   ```nginx
   gzip on;
   gzip_types text/plain text/css text/javascript application/json;
   gzip_min_length 1000;
   ```

2. **Set cache headers** in Nginx:
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
       expires 30d;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Monitor Docker resources**:
   ```bash
   docker stats
   ```

### Troubleshooting

**Backend won't start:**
```bash
docker-compose logs backend
# Check environment variables and JWT_SECRET
```

**Frontend blank page:**
```bash
docker-compose logs frontend
# Check VITE_API_URL points to correct backend URL
```

**Health check failing:**
```bash
# Manually test endpoints
curl -v http://localhost:3001/health
curl -v http://localhost:3000
```

**Database issues:**
```bash
# Check data.json file permissions
docker-compose exec backend ls -la /app/data.json
```

---

## Security Checklist

- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Set `WEBHOOK_SECRET` for payment webhooks
- [ ] Configure `ALLOWED_ORIGINS` for production domain
- [ ] Use HTTPS/SSL in production
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Enable rate limiting for auth endpoints
- [ ] Backup data regularly
- [ ] Monitor logs for errors
- [ ] Restrict database file permissions
- [ ] Use environment variables for secrets (never hardcode)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bash scripts/setup.sh` | Setup local development |
| `bash scripts/deploy.sh production` | Deploy with Docker |
| `bash scripts/health-check.sh` | Verify services |
| `docker-compose logs -f` | View logs |
| `docker-compose ps` | View running services |
| `docker-compose down` | Stop all services |

---

## Support

For issues or questions, check:
- Server logs: `docker-compose logs`
- Backend health: `curl http://localhost:3001/health`
- Frontend: http://localhost:3000

---

Last updated: 2026-06-03

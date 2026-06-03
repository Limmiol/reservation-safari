# 🚀 Quick Start Guide - Reservation Safari Deployment

## ✅ Deployment Ready!

Your Reservation Safari system is now fully configured for production deployment. Choose your deployment method below.

---

## 📦 Local Development (Fastest)

Perfect for testing before deployment.

### 1. Setup

**Windows:**
```powershell
cd .\scripts
.\setup.bat
```

**macOS/Linux:**
```bash
bash scripts/setup.sh
```

### 2. Configure Environment

Edit `.env.local` and `server/.env` with your settings:
```bash
# .env.local (Frontend)
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-domain.base44.app

# server/.env (Backend)
JWT_SECRET=your-secure-secret-key
WEBHOOK_SECRET=your-webhook-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Start Services

**Terminal 1 - Backend:**
```bash
npm run server
```
→ Backend runs at `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
→ Frontend runs at `http://localhost:5173`

### 4. Verify

```bash
# Check backend health
curl http://localhost:3001/health

# Frontend should be accessible at:
# http://localhost:5173
```

✅ **Local development is running!**

---

## 🐳 Docker Deployment (Recommended for Production)

One-command deployment that works everywhere.

### Prerequisites

- Docker installed on your server
- Docker Compose installed

### 1. Setup on Your Server

```bash
# SSH into your server
ssh user@your-server-ip

# Create app directory
mkdir -p ~/safari-app && cd ~/safari-app

# Copy project files
# (Use scp, git clone, or file transfer method of your choice)
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .env.production

# Edit with your settings
nano .env.production
```

**Key variables to update:**
```bash
NODE_ENV=production
JWT_SECRET=<generate-random-32-char-string>
WEBHOOK_SECRET=<generate-random-32-char-string>
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
VITE_BASE44_APP_ID=<your-base44-app-id>
VITE_BASE44_APP_BASE_URL=<your-base44-url>
```

### 3. Deploy

**Windows:**
```powershell
.\scripts\deploy.bat production
```

**Linux/macOS:**
```bash
bash scripts/deploy.sh production
```

Or manually:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### 4. Verify Deployment

**Windows:**
```powershell
.\scripts\health-check.bat
```

**Linux/macOS:**
```bash
bash scripts/health-check.sh
```

Or manually:
```bash
curl http://localhost:3001/health
curl http://localhost:3000
docker-compose ps
```

✅ **Docker deployment is running!**

---

## ☁️ Cloud Platform Deployment

### AWS / DigitalOcean / Linode (1-Click)

1. Provision a **Linux VM** (Ubuntu 20.04+ recommended, 2GB RAM minimum)
2. Install Docker and Docker Compose
3. Clone your repository
4. Follow **Docker Deployment** steps above

**Setup Script:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Render.com (Easiest)

1. Go to [Render.com](https://render.com)
2. Create two **Web Services**:
   - **Backend**: Docker image, uses `Dockerfile.backend`
   - **Frontend**: Docker image, uses `Dockerfile.frontend`
3. Add environment variables from `.env.example`
4. Deploy!

### Railway.app

```bash
npm install -g @railway/cli
railway link
railway up
```

### Vercel (Frontend only)

1. [Connect GitHub repo to Vercel](https://vercel.com)
2. Environment variables: Copy from `.env.example`
3. Redeploy on push!

---

## 🔒 Production Checklist

Before going live, ensure:

- [ ] **Security**: `JWT_SECRET` is strong (32+ chars, random)
- [ ] **CORS**: `ALLOWED_ORIGINS` set to your domain only
- [ ] **SSL**: Use HTTPS on production (Let's Encrypt is free!)
- [ ] **Environment**: `NODE_ENV=production`
- [ ] **Backups**: Set up automated backups of `server/data.json`
- [ ] **Monitoring**: Enable health check monitoring
- [ ] **Logs**: Set up log aggregation (optional but recommended)
- [ ] **Firewall**: Restrict access to necessary ports
- [ ] **DNS**: Point your domain to your server
- [ ] **Email**: Test email notifications work

---

## 📊 Service URLs

After deployment:

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:3001 | 3001 |
| Health Check | http://localhost:3001/health | 3001 |

---

## 🛠️ Common Commands

### View Logs
```bash
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f frontend     # Frontend only
```

### Restart Services
```bash
docker-compose restart              # Restart all
docker-compose restart backend      # Restart backend
docker-compose down && docker-compose up -d  # Full restart
```

### Check Status
```bash
docker-compose ps
docker stats
```

### Stop Services
```bash
docker-compose down
```

### View Uploads
```bash
ls -la server/uploads/
```

---

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Frontend dev environment |
| `server/.env` | Backend environment |
| `.env.production` | Production Docker environment |
| `docker-compose.yml` | Docker orchestration |
| `Dockerfile.frontend` | Frontend container image |
| `Dockerfile.backend` | Backend container image |

---

## 🐛 Troubleshooting

### Backend won't start
```bash
docker-compose logs backend
# Check: JWT_SECRET is set
# Check: Port 3001 is not in use
# Check: Node version is 18+
```

### Frontend blank page
```bash
docker-compose logs frontend
# Check: VITE_API_URL points to backend
# Check: Frontend can reach backend
```

### Port already in use
```bash
# Change ports in .env file or docker-compose.yml
# Or find and stop the process:
lsof -i :3001  # Find what's using port 3001
```

### Permission denied
```bash
# Grant execute permission to scripts
chmod +x scripts/*.sh
```

---

## 📚 More Information

- **Full Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Environment Variables**: See [.env.example](./.env.example)
- **Docker Docs**: https://docs.docker.com
- **Vite Documentation**: https://vitejs.dev

---

## 🎉 You're Ready!

Your Reservation Safari system is production-ready. Choose a deployment method above and get started!

**Questions?** Check the full deployment guide or system logs.

---

*Last updated: 2026-06-03*

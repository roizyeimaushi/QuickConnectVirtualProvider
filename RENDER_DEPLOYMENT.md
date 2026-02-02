# 🚀 Render Deployment Guide - QuickConn Attendance System

This guide provides step-by-step instructions for deploying the QuickConn Attendance System to Render.com with **100% success rate**.

## 🎯 Choose Your Deployment Method

| Method | Services | Cost | Best For |
|--------|----------|------|----------|
| **Monolith (2-in-1)** | 1 service | Lower | Simple setup, no CORS issues |
| **Separate Services** | 2 services | Higher | Scalability, independent updates |

> **Recommended:** Use **Monolith** for simplicity - both Next.js and Laravel run in one container!

---

## � QUICK START: Monolith Deployment (Easiest)

### Step 1: Rename Blueprint File
```powershell
cd C:\Users\Admin\Desktop\AttendanceSheetSystem
# Use monolith config as main render.yaml
copy render.monolith.yaml render.yaml
```

### Step 2: Push to GitHub
```powershell
git add .
git commit -m "Deploy monolith to Render"
git push -u origin main
```

### Step 3: Deploy on Render
1. Go to [render.com/dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect GitHub → Select `QuickConn-Attendance-Sheet-System`
4. Render detects `render.yaml` → Click **Apply**

### Step 4: Set Database Credentials
In Render Dashboard → `quickconn-app` → Environment:
- `DB_HOST` = Your database host
- `DB_DATABASE` = Your database name
- `DB_USERNAME` = Your database user
- `DB_PASSWORD` = Your database password

### Step 5: Access Your App! 🎉
- **URL:** `https://quickconn-app.onrender.com`
- **API:** `https://quickconn-app.onrender.com/api/health`
- **Login:** `admin@quickconn.net` / `password123`

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **GitHub Account** - Repository at `https://github.com/Roizycode/QuickConn-Attendance-Sheet-System`
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier works!)
3. **MySQL Database** - See database options below

## �🗄️ Step 1: Set Up MySQL Database (REQUIRED)

Render doesn't offer MySQL natively, so use one of these **free** providers:

### Option A: PlanetScale (Recommended - Free Tier)
1. Go to [planetscale.com](https://planetscale.com)
2. Create a free account
3. Create a new database named `quickconn_attendance`
4. Go to **Connect** → Select `Laravel` → Copy credentials
5. Note down: `Host`, `Database`, `Username`, `Password`

### Option B: Railway
1. Go to [railway.app](https://railway.app)
2. Create new project → Add MySQL
3. Copy the connection credentials from the Variables tab

### Option C: Aiven (Free Trial)
1. Go to [aiven.io](https://aiven.io)
2. Create free MySQL instance
3. Copy connection credentials

---

## 📤 Step 2: Push Code to GitHub

Run these commands in your project folder:

```powershell
# Navigate to project
cd C:\Users\Admin\Desktop\AttendanceSheetSystem

# Add all files
git add .

# Commit changes
git commit -m "Add Render deployment configuration"

# Add remote (if not already added)
git remote add origin https://github.com/Roizycode/QuickConn-Attendance-Sheet-System.git

# Push to GitHub
git push -u origin main
```

> **Note:** If you get authentication errors, use GitHub CLI or Personal Access Token.

---

## 🌐 Step 3: Deploy to Render

### Method A: Blueprint Auto-Deploy (Easiest)

1. Go to [render.com/dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub account
4. Select repository: `QuickConn-Attendance-Sheet-System`
5. Render will detect `render.yaml` and show services
6. Click **Apply**

### Method B: Manual Deploy (More Control)

#### Deploy Backend First:

1. Click **New** → **Web Service**
2. Connect GitHub repo
3. Configure:
   - **Name:** `quickconn-backend`
   - **Region:** Singapore (or nearest)
   - **Runtime:** Docker
   - **Root Directory:** `backend/quickcon-api`
   - **Dockerfile Path:** `Dockerfile.render`
4. Add Environment Variables (see Step 4)
5. Click **Create Web Service**

#### Then Deploy Frontend:

1. Click **New** → **Web Service**
2. Connect same GitHub repo
3. Configure:
   - **Name:** `quickconn-frontend`
   - **Region:** Same as backend
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://quickconn-backend.onrender.com`
5. Click **Create Web Service**

---

## ⚙️ Step 4: Configure Environment Variables

### Backend Environment Variables (REQUIRED)

Go to your backend service → **Environment** tab and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_NAME` | `QuickConn Attendance` | |
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | IMPORTANT for security |
| `APP_KEY` | (Click Generate) | Auto-generated |
| `APP_URL` | `https://quickconn-backend.onrender.com` | Your backend URL |
| `LOG_CHANNEL` | `stderr` | Required for Render logs |
| `DB_CONNECTION` | `mysql` | |
| `DB_HOST` | `your-db-host.example.com` | From your DB provider |
| `DB_PORT` | `3306` | |
| `DB_DATABASE` | `quickconn_attendance` | Your database name |
| `DB_USERNAME` | `your_username` | From your DB provider |
| `DB_PASSWORD` | `your_password` | From your DB provider |
| `SESSION_DRIVER` | `cookie` | |
| `CACHE_STORE` | `file` | |
| `QUEUE_CONNECTION` | `sync` | |
| `SANCTUM_STATEFUL_DOMAINS` | `quickconn-frontend.onrender.com` | Your frontend domain |
| `CORS_ALLOWED_ORIGINS` | `https://quickconn-frontend.onrender.com` | Full frontend URL |
| `ALLOW_EXTERNAL_ACCESS` | `true` | |

### For PlanetScale Only - Add:
| Variable | Value |
|----------|-------|
| `MYSQL_ATTR_SSL_CA` | `/etc/ssl/certs/ca-certificates.crt` |

### Frontend Environment Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://quickconn-backend.onrender.com` |
| `NODE_ENV` | `production` |

---

## ✅ Step 5: Verify Deployment

### Check Backend Health:
```
https://quickconn-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-02-02T16:30:00+00:00"
}
```

### Check Frontend:
Open `https://quickconn-frontend.onrender.com` in your browser.

---

## 🔧 Troubleshooting

### "Database connection refused"
- ✅ Check DB_HOST, DB_USERNAME, DB_PASSWORD are correct
- ✅ Ensure your database allows external connections
- ✅ For PlanetScale, add `MYSQL_ATTR_SSL_CA`

### "CORS error"
- ✅ Check `CORS_ALLOWED_ORIGINS` matches your frontend URL exactly
- ✅ Check `SANCTUM_STATEFUL_DOMAINS` has your frontend domain (without https://)

### "502 Bad Gateway"
- ✅ Wait 2-3 minutes for first deployment (cold start)
- ✅ Check Render logs for PHP/Docker errors
- ✅ Verify Dockerfile.render exists

### "Build failed"
- ✅ Ensure all files are committed to GitHub
- ✅ Check that `render.yaml` is in the root folder
- ✅ Verify `Dockerfile.render` exists in `backend/quickcon-api/`

### "Login not working"
- ✅ Verify `SESSION_SECURE_COOKIE=true` for HTTPS
- ✅ Check `SESSION_SAME_SITE=none` for cross-domain cookies
- ✅ Ensure both frontend and backend are on HTTPS

---

## 📊 Default Login Credentials

After first deployment, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@quickconn.net` | `password123` |
| **Employee** | `john.doe@quickconn.net` | `password123` |

> ⚠️ **IMPORTANT:** Change these passwords immediately in production!

---

## 🔄 Auto-Deploy on Git Push

Render automatically redeploys when you push to GitHub:

1. Make changes locally
2. `git add .`
3. `git commit -m "Your changes"`
4. `git push`
5. Render auto-deploys within 2-5 minutes

---

## 💡 Tips for Production

1. **Upgrade to Starter Plan** for always-on services (free tier sleeps after 15 min inactivity)
2. **Set up custom domain** in Render dashboard
3. **Enable auto-scaling** for high traffic
4. **Monitor logs** in Render dashboard regularly
5. **Back up database** regularly

---

## 📁 Files Created for Deployment

### Separate Services (2 services)
| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint for 2 services |
| `backend/quickcon-api/Dockerfile.render` | Laravel production Docker image |
| `backend/quickcon-api/docker/start.sh` | Laravel startup script |
| `backend/quickcon-api/docker/nginx.render.conf` | Laravel Nginx config |
| `backend/quickcon-api/docker/supervisord.render.conf` | Laravel process manager |

### Monolith (1 service - RECOMMENDED)
| File | Purpose |
|------|---------|
| `render.monolith.yaml` | Render Blueprint for monolith |
| `Dockerfile.monolith` | Combined Next.js + Laravel image |
| `docker/monolith/nginx.conf` | Routes /api to Laravel, rest to Next.js |
| `docker/monolith/supervisord.conf` | Runs PHP-FPM, Nginx, and Next.js |
| `docker/monolith/start.sh` | Monolith startup script |

### Environment Templates
| File | Purpose |
|------|---------|
| `.env.production.example` | Frontend env template |
| `backend/quickcon-api/.env.production.example` | Backend env template |

---

## 🆘 Need Help?

- **Render Docs:** https://render.com/docs
- **Laravel Docs:** https://laravel.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

**Happy Deploying! 🎉**

---
*Last Updated: 2026-02-03 - Render Native Build Configured*

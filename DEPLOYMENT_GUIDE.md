# 🚀 Deployment Guide: QuickConn Virtual

## Architecture Overview

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Vercel            │      │   Render/Railway    │      │   TiDB Cloud        │
│   (Next.js)         │ ───► │   (Laravel API)     │ ───► │   (Database)        │
│   Frontend          │      │   Backend           │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## Part 1: Deploy Laravel Backend to Render

### Step 1: Create a Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Create New Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repo
3. **Root Directory**: `backend/quickcon-api`
4. **Build Command**: `composer install --no-dev --optimize-autoloader && php artisan config:cache && php artisan route:cache && php artisan migrate --force`
5. **Start Command**: `php artisan serve --host=0.0.0.0 --port=$PORT`

### Step 3: Add Environment Variables on Render

| Key | Value |
|-----|-------|
| `APP_NAME` | `QuickCon Virtual` |
| `APP_ENV` | `production` |
| `APP_KEY` | `base64:GENERATE_NEW_KEY` (run `php artisan key:generate --show`) |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://your-app.onrender.com` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` |
| `DB_DATABASE` | `test` |
| `DB_USERNAME` | `4TxQzeB39aZrgYX.root` |
| `DB_PASSWORD` | `m8OhaLdczMdGfQIE` |
| `SESSION_DRIVER` | `database` |
| `CACHE_STORE` | `database` |
| `CORS_ALLOWED_ORIGINS` | `https://quickconnvirtual.vercel.app` |
| `SANCTUM_STATEFUL_DOMAINS` | `quickconnvirtual.vercel.app` |
| `FILESYSTEM_DISK` | `public` |
| `QUEUE_CONNECTION` | `sync` |
| `LOG_CHANNEL` | `stderr` |
| `LOG_LEVEL` | `error` |

### Step 4: Deploy and Get Your Backend URL
Example: `https://quickcon-api.onrender.com`

---

## Part 2: Deploy Next.js Frontend to Vercel

### Step 1: Go to Vercel
1. https://vercel.com
2. Import your GitHub repo

### Step 2: Configure Project
- **Project Name**: `quickconnvirtual`
- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (the root, NOT backend)

### Step 3: Add Environment Variable

You only need **ONE** environment variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://quickcon-api.onrender.com/api` |

⚠️ **Important**: Replace `https://quickcon-api.onrender.com` with your actual Render backend URL!

### Step 4: Deploy!

---

## TiDB Database Notes

Your TiDB Cloud credentials:
- **Host**: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
- **Port**: `4000`
- **Database**: `test`
- **Username**: `4TxQzeB39aZrgYX.root`
- **Password**: `m8OhaLdczMdGfQIE`

TiDB is MySQL-compatible, so Laravel works with it using `DB_CONNECTION=mysql`.

---

## Post-Deployment Checklist

1. [ ] Backend deployed and running on Render
2. [ ] Run migrations: `php artisan migrate --force`
3. [ ] Create admin user: `php artisan db:seed`
4. [ ] Frontend deployed on Vercel
5. [ ] Test login functionality
6. [ ] Test attendance features

---

## Troubleshooting

### CORS Errors
Make sure `CORS_ALLOWED_ORIGINS` includes your Vercel URL with `https://`

### 401 Unauthorized
Make sure `SANCTUM_STATEFUL_DOMAINS` includes your Vercel domain (without `https://`)

### Database Connection Failed
- Check TiDB credentials
- Ensure SSL is enabled for TiDB Cloud

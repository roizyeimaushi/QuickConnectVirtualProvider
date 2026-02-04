#!/bin/bash
# ============================================
# FAST Render Startup Script for Laravel
# ============================================

set -e

echo "=== QuickConnect API Starting (Fast Mode) ==="

# Quick APP_KEY check
if [ -z "$APP_KEY" ] || [[ ! "$APP_KEY" =~ ^base64: ]]; then
    echo "Generating valid APP_KEY..."
    php artisan key:generate --force --no-interaction
fi

# Run migrations in background if DB is ready
echo "Running migrations..."
php artisan migrate --force --no-interaction 2>&1 || echo "Migration pending - will retry"

# Quick optimization (skip if already cached)
echo "Caching config..."
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction

# Seed only if needed (runs fast if already seeded)
php artisan db:seed --class=SettingsSeeder --force --no-interaction 2>/dev/null || true
php artisan db:seed --class=EnsureAdminUserSeeder --force --no-interaction 2>/dev/null || true

# Create storage link (idempotent)
php artisan storage:link 2>/dev/null || true

# Set port
export PORT=${PORT:-10000}
sed -i "s/listen 10000/listen $PORT/g" /etc/nginx/http.d/default.conf

echo "=== Starting on port $PORT ==="
exec /usr/bin/supervisord -c /etc/supervisord.conf

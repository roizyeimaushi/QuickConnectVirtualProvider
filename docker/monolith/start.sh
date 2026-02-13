#!/bin/sh
# ============================================
# ROBUST Monolith Startup Script
# Runs both Next.js + Laravel in one container
# ============================================

echo "=== QuickConn Monolith Starting (Railway Mode) ==="

# 1. LARAVEL SETUP
cd /var/www/api

# 2. FIX APP_KEY
if [ -z "$APP_KEY" ] || [[ ! "$APP_KEY" =~ ^base64: ]]; then
    echo "Detected invalid/missing APP_KEY. Regenerating..."
    NEW_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    export APP_KEY="$NEW_KEY"
    echo "APP_KEY set to: $APP_KEY"
fi

# 3. FORCE DEBUG (Temporarily)
export APP_DEBUG=true

# 4. RUN MIGRATIONS
echo "Running database migrations..."
php artisan migrate --force --no-interaction || echo "⚠️ Migration failed - check DB credentials in Railway Dashboard"

# 5. OPTIMIZE
echo "Optimizing framework..."
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

# 6. PERMISSIONS
echo "Setting permissions..."
chown -R www-data:www-data /var/www/api/storage /var/www/api/bootstrap/cache /run/php
chmod -R 775 /var/www/api/storage /var/www/api/bootstrap/cache /run/php

# Ensure symlink works
rm -rf public/storage
php artisan storage:link --no-interaction || true

# 7. CONFIGURE PORTS
export PORT=${PORT:-8080}
sed -i "s/listen 8080/listen $PORT/g" /etc/nginx/http.d/default.conf
sed -i "s/listen \[::\]:8080/listen $PORT/g" /etc/nginx/http.d/default.conf

echo "=== Starting Services on Port $PORT ==="
exec /usr/bin/supervisord -c /etc/supervisord.conf

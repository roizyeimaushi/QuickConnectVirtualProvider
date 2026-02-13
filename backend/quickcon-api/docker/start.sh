#!/bin/bash
# ============================================
# ROBUST Railway Startup Script for Laravel
# ============================================

set -e

echo "=== QuickConnect API Starting (Railway Mode) ==="

# 1. FIX APP_KEY
if [ -z "$APP_KEY" ] || [[ ! "$APP_KEY" =~ ^base64: ]]; then
    echo "Detected invalid/missing APP_KEY. Regenerating..."
    NEW_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    export APP_KEY="$NEW_KEY"
    echo "APP_KEY set to: $APP_KEY"
fi

# 2. FORCE DEBUG (For 500 error investigation - Remove later if desired)
export APP_DEBUG=true
export APP_ENV=production

# 3. FIX SSL CA PATH (If using TiDB/MySQL SSL)
if [ -n "$MYSQL_ATTR_SSL_CA" ]; then
    echo "Detecting SSL CA path..."
    # If the path looks like a Windows path or just filename, point it to storage
    export MYSQL_ATTR_SSL_CA="/var/www/html/storage/cacert.pem"
    echo "SSL CA Path forced to: $MYSQL_ATTR_SSL_CA"
fi

# 4. PREPARE DIRECTORIES
echo "Preparing storage directories..."
mkdir -p storage/logs storage/framework/{cache,sessions,views} bootstrap/cache
mkdir -p storage/app/public/avatars
mkdir -p /run/php

# Ensure symlink works
rm -rf public/storage
php artisan storage:link --no-interaction || true

# 5. RUN MIGRATIONS
echo "Running database migrations..."
# Increase memory limit for migrations if needed
php -d memory_limit=512M artisan migrate --force --no-interaction || echo "⚠️ Migration failed - check DB credentials in Railway Dashboard"

# 6. OPTIMIZE
echo "Optimizing framework..."
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

# 7. PERMISSIONS
echo "Setting permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /run/php
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /run/php

# 8. CONFIGURE NGINX PORT
export PORT=${PORT:-8080}
# Replace ONLY IPv4 listen to avoid IPv6 errors if container lacks IPv6
sed -i "s/listen 8080/listen $PORT/g" /etc/nginx/http.d/default.conf
sed -i "s/listen \[::\]:8080/listen $PORT/g" /etc/nginx/http.d/default.conf

echo "=== Starting Services on Port $PORT ==="
exec /usr/bin/supervisord -c /etc/supervisord.conf

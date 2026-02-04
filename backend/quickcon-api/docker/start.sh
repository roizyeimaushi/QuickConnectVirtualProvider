#!/bin/bash
# ============================================
# Render Startup Script for Laravel
# ============================================

set -e

echo "=== QuickConn API Starting ==="

# Handle APP_KEY for Laravel
# Laravel requires APP_KEY in format: base64:XXXXXX (44+ chars base64)
if [ -z "$APP_KEY" ]; then
    echo "APP_KEY not set - generating..."
    php artisan key:generate --force
elif [[ ! "$APP_KEY" =~ ^base64: ]]; then
    # Render's generateValue creates raw string, not base64-prefixed
    # We need to generate a proper Laravel key
    echo "APP_KEY found but not in Laravel format - regenerating..."
    php artisan key:generate --force
else
    echo "APP_KEY is properly formatted."
fi

# Create storage link if it doesn't exist
php artisan storage:link 2>/dev/null || true

# Clear and cache configuration for production
echo "Optimizing for production..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations (with force for production)
echo "Running database migrations..."
php artisan migrate --force

# Seed settings if empty
echo "Checking database seeders..."
php artisan db:seed --class=SettingsSeeder --force || echo "SettingsSeeder failed or already run"
php artisan db:seed --class=EnsureAdminUserSeeder --force || echo "EnsureAdminUserSeeder failed or already run"

# Fix permissions
chown -R www-data:www-data /var/www/html/storage
chown -R www-data:www-data /var/www/html/bootstrap/cache

echo "=== Starting Supervisor ==="

# Use Render's PORT environment variable (default 10000)
export PORT=${PORT:-10000}
sed -i "s/listen 10000/listen $PORT/" /etc/nginx/http.d/default.conf

# Start supervisor (manages nginx + php-fpm)
exec /usr/bin/supervisord -c /etc/supervisord.conf

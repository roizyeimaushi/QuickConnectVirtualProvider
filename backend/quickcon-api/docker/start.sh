#!/bin/sh
# ============================================
# Render Startup Script for Laravel
# ============================================

set -e

echo "=== QuickConn API Starting ==="

# Generate APP_KEY if not set (using Render's generate)
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
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
php artisan db:seed --class=SettingsSeeder --force 2>/dev/null || true
php artisan db:seed --class=EnsureAdminUserSeeder --force 2>/dev/null || true

# Fix permissions
chown -R www-data:www-data /var/www/html/storage
chown -R www-data:www-data /var/www/html/bootstrap/cache

echo "=== Starting Supervisor ==="

# Use Render's PORT environment variable (default 10000)
export PORT=${PORT:-10000}
sed -i "s/listen 10000/listen $PORT/" /etc/nginx/http.d/default.conf

# Start supervisor (manages nginx + php-fpm)
exec /usr/bin/supervisord -c /etc/supervisord.conf

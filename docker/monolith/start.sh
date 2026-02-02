#!/bin/sh
# ============================================
# Monolith Startup Script
# Runs both Next.js + Laravel in one container
# ============================================

# set -e (Disabled to prevent crash loop)

echo "=== QuickConn Monolith Starting ==="
echo "=== Next.js Frontend + Laravel API ==="

# ==========================================
# LARAVEL SETUP
# ==========================================
cd /var/www/api

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
fi

# Create storage link
php artisan storage:link 2>/dev/null || true

# Optimize for production
echo "Optimizing Laravel..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
echo "Running database migrations..."
php artisan migrate --force || echo "❌ Migration failed! Check DB credentials."

# Seed settings
php artisan db:seed --class=SettingsSeeder --force 2>/dev/null || echo "❌ Seeding failed!"

# Fix permissions
chown -R www-data:www-data /var/www/api/storage
chown -R www-data:www-data /var/www/api/bootstrap/cache

# ==========================================
# CONFIGURE PORTS
# ==========================================
# Use Render's PORT environment variable (default 10000)
export PORT=${PORT:-10000}
sed -i "s/listen 10000/listen $PORT/" /etc/nginx/http.d/default.conf

echo "=== Starting Services on Port $PORT ==="
echo "  - Nginx (reverse proxy)"
echo "  - PHP-FPM (Laravel API)"
echo "  - Next.js (React Frontend)"

# Start supervisor (manages all services)
exec /usr/bin/supervisord -c /etc/supervisord.conf

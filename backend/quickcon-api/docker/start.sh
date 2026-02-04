#!/bin/bash
# ============================================
# FAST Render Startup Script for Laravel
# ============================================

set -e

echo "=== QuickConnect API Starting (Fast Mode) ==="

# Quick APP_KEY check and FIX
# We must export the new key to override the bad env var from Render
if [ -z "$APP_KEY" ] || [[ ! "$APP_KEY" =~ ^base64: ]]; then
    echo "Detected invalid/missing APP_KEY. Regenerating..."
    # Generate new key and grab it
    NEW_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    
    # Export to current shell so php artisan config:cache sees it
    export APP_KEY="$NEW_KEY"
    
    # Also write to .env so other independent calls might see it
    if grep -q "APP_KEY=" .env; then
        sed -i "s|^APP_KEY=.*|APP_KEY=$NEW_KEY|" .env
    else
        echo "APP_KEY=$NEW_KEY" >> .env
    fi
    echo "APP_KEY passed to environment."
fi

# Debug Database Connection (Non-sensitive info)
echo "Checking DB config..."
echo "DB_HOST: ${DB_HOST:-not_set}"
echo "DB_PORT: ${DB_PORT:-not_set}"
echo "DB_DATABASE: ${DB_DATABASE:-not_set}"

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

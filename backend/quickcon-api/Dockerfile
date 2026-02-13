# ============================================
# Laravel PHP API - PRO optimized for Railway
# ============================================

FROM php:8.2-fpm-alpine

# Install ALL system dependencies
RUN apk add --no-cache \
    git curl bash zip unzip \
    libpng-dev libzip-dev oniguruma-dev postgresql-dev icu-dev mysql-client \
    nginx supervisor \
    && docker-php-ext-install -j$(nproc) pdo_mysql pdo_pgsql mbstring exif pcntl bcmath gd zip intl \
    && rm -rf /var/cache/apk/* /tmp/*

# Get Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy ONLY dependency files first
COPY composer.json composer.lock ./

# Install PHP deps
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction --prefer-dist \
    && rm -rf ~/.composer/cache

# Setup PHP-FPM for performance
RUN rm -f /usr/local/etc/php-fpm.d/*.conf
RUN echo "[www]" > /usr/local/etc/php-fpm.d/www.conf \
    && echo "user = www-data" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "group = www-data" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "listen = 127.0.0.1:9000" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm = dynamic" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_children = 20" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.start_servers = 5" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.min_spare_servers = 3" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_spare_servers = 10" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "catch_workers_output = yes" >> /usr/local/etc/php-fpm.d/www.conf

# Copy config and app
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Copy application code
COPY . .

# Final setup
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/logs storage/framework/{cache,sessions,views} bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 8080

# Railway uses $PORT
HEALTHCHECK --interval=30s --timeout=5s \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

CMD ["/start.sh"]

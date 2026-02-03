# ===== PHP Laravel Backend =====
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    libzip-dev \
    libzip-dev \
    zip \
    unzip \
    gettext \
    nginx \
    supervisor

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy composer files first for caching
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs

# Copy application code
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

# Copy nginx config template
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy supervisor config
# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8000

CMD sh -c "\
    envsubst '\$PORT' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/http.d/default.conf \
    && supervisord -c /etc/supervisord.conf"

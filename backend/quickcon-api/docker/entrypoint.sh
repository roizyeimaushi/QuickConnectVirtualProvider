#!/bin/sh
set -e

# Default to port 8000 if PORT is not set
PORT="${PORT:-8000}"

echo "Starting QuickConn Virtual API on port $PORT..."

# Replace listen 8000 with listen $PORT in nginx.conf
sed -i "s/listen 8000;/listen $PORT;/g" /etc/nginx/http.d/default.conf

# Start Supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf

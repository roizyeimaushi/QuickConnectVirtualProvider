#!/bin/sh
set -e

# Default to port 8000 if PORT is not set
PORT="${PORT:-8000}"
export PORT

echo "Starting QuickConn Virtual API on port $PORT..."

# Substitute env vars in nginx template and write to actual config
envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/http.d/default.conf

# Start Supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf

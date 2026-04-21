#!/bin/sh
set -e

ENV_JS="/usr/share/nginx/html/env.js"

cat > "$ENV_JS" << ENVEOF
window.__env__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}",
};
ENVEOF

exec nginx -g "daemon off;"

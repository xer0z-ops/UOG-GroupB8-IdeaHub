#!/bin/sh

NETWORK_NAME=uog-net

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  docker network create "$NETWORK_NAME"
fi

if [ "$(docker ps -a -q -f name=uog-celery)" ]; then
  docker rm -f uog-celery
fi

docker run -d \
  --name uog-celery \
  --network "$NETWORK_NAME" \
  --env-file .env \
  -e DJANGO_SETTINGS_MODULE=uog_api.settings \
  -e CELERY_BROKER_URL=redis://redis-server:6379/0 \
  -e CELERY_RESULT_BACKEND=redis://redis-server:6379/0 \
  uog-api:latest \
  celery -A uog_api.celery worker --loglevel=info -Q default,mail,io

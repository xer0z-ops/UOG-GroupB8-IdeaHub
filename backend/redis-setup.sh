#!/bin/bash

NETWORK_NAME=uog-net

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  docker network create "$NETWORK_NAME"
fi


docker run -d \
  --name redis-server \
  --network uog-net \
  --restart unless-stopped \
  -p 6379:6379 \
  -v redis-data:/data \
  -v $(pwd)/redis.conf:/usr/local/etc/redis/redis.conf \
  redis:7-alpine redis-server /usr/local/etc/redis/redis.conf

echo "Redis container created and started"
echo "Connection: redis://localhost:6379"

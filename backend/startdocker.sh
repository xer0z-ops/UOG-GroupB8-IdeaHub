#!/bin/bash

NETWORK_NAME=uog-net

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network create "$NETWORK_NAME"
fi

if [ $(docker ps -a -q -f name=uog-api) ]; then
    read -p "Container 'uog-api' exists. Do you want to remove it? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        docker rm -f uog-api
    else
        echo "Skipping container removal."
    fi
fi

docker build -t uog-api .

# docker run --network host -d -p 8080:8080 --name uog-api -v $(pwd)/src/storage:/app/src/storage uog-api:latest
docker run --network "$NETWORK_NAME" -p 8000:8000 --env-file .env -d --name uog-api uog-api:latest

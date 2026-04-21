#!/bin/bash

NETWORK_NAME=uog-net

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network create "$NETWORK_NAME"
fi

if [ $(docker ps -a -q -f name=uog-frontend) ]; then
    read -p "Container 'uog-frontend' exists. Do you want to remove it? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        docker rm -f uog-frontend
    else
        echo "Skipping container removal."
    fi
fi

docker build -t uog-frontend .

docker run --network "$NETWORK_NAME" -p 80:80 --env-file .env -d --name uog-frontend uog-frontend:latest
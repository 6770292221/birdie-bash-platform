#!/bin/bash

echo "🛑 Stopping Birdie Bash Platform..."

# Stop and remove containers
docker-compose down

echo "🧹 Cleaning up..."

# Optional: Remove unused images
read -p "Remove unused Docker images? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker image prune -f
fi

echo "✅ All services stopped!"
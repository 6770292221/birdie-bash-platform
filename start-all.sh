#!/bin/bash

echo "🚀 Starting Birdie Bash Platform..."

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start all services
echo "🏗️  Building and starting all services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check container status
echo "📋 Container Status:"
docker-compose ps

echo ""
echo "✅ All services are starting up!"
echo ""
echo "🌐 Service URLs:"
echo "Frontend:      http://localhost:9001"
echo "Gateway:       http://localhost:3000"
echo "Auth Service:  http://localhost:3001"
echo "Event Service: http://localhost:3003"
echo "Registration:  http://localhost:3005"
echo "RabbitMQ UI:   http://localhost:15672 (admin/password123)"
echo "MongoDB:       localhost:27017 (admin/password123)"
echo "MySQL:         localhost:3306 (root/root123)"
echo ""
echo "📝 To view logs: docker-compose logs -f [service-name]"
echo "📝 To stop all:  docker-compose down"
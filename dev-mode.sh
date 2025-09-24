#!/bin/bash

echo "🔧 Starting Development Mode..."

# Start infrastructure services only
echo "🏗️  Starting infrastructure services..."
docker-compose up -d mongodb rabbitmq mysql

echo "⏳ Waiting for infrastructure to be ready..."
sleep 5

# Start backend services
echo "🔌 Starting backend services..."
docker-compose up -d auth-service event-service registration-service gateway

echo "⏳ Waiting for backend services..."
sleep 5

echo "✅ Backend services running!"
echo ""
echo "🌐 Service URLs:"
echo "Gateway:       http://localhost:3000"
echo "Auth Service:  http://localhost:3001"
echo "Event Service: http://localhost:3003"
echo "Registration:  http://localhost:3005"
echo "RabbitMQ UI:   http://localhost:15672 (admin/password123)"
echo ""
echo "💻 Frontend is running separately on: http://localhost:9001"
echo "📝 To start frontend container: docker-compose up frontend"
echo "📝 To view logs: docker-compose logs -f [service-name]"
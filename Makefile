.PHONY: help setup up down build logs clean restart

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

setup: ## Install dependencies for core services
	@echo "🔧 Installing dependencies for core services..."
	@for service in auth-service event-service registration-service gateway; do \
		if [ -d $$service ]; then \
			echo "📦 Installing dependencies for $$service..."; \
			cd $$service && npm install && cd ..; \
		fi \
	done
	@echo "✅ Dependencies installed for core services"

build: ## Build all Docker images
	@echo "🏗️  Building Docker images..."
	docker-compose build

up: ## Start all services
	@echo "🚀 Starting all services..."
	docker-compose up -d

up-logs: ## Start all services with logs
	@echo "🚀 Starting all services with logs..."
	docker-compose up

down: ## Stop all services
	@echo "🛑 Stopping all services..."
	docker-compose down

logs: ## Show logs from all services
	docker-compose logs -f

logs-service: ## Show logs from specific service (usage: make logs-service SERVICE=event-service)
	docker-compose logs -f $(SERVICE)

restart: ## Restart all services
	@echo "🔄 Restarting all services..."
	docker-compose restart

restart-service: ## Restart specific service (usage: make restart-service SERVICE=event-service)
	docker-compose restart $(SERVICE)

clean: ## Clean up Docker images and containers
	@echo "🧹 Cleaning up..."
	docker-compose down -v --remove-orphans
	docker system prune -f

status: ## Show status of all services
	docker-compose ps

shell: ## Open shell in specific service (usage: make shell SERVICE=event-service)
	docker-compose exec $(SERVICE) sh

dev: ## Start services in development mode
	@echo "🔧 Starting development environment..."
	docker-compose up --build

ports: ## Show core service ports
	@echo "Core Service Ports:"
	@echo "Gateway:            http://localhost:3000"
	@echo "Auth Service:       http://localhost:3001"
	@echo "Event Service:      http://localhost:3003"
	@echo "Registration Service: http://localhost:3005"
	@echo ""
	@echo "Infrastructure:"
	@echo "MongoDB:            mongodb://localhost:27017"
	@echo "RabbitMQ UI:        http://localhost:15672 (admin/password123)"
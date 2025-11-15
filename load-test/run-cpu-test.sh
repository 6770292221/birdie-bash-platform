#!/usr/bin/env bash

# Load Test Script with CPU Mode Management
# Usage: ./load-test/run-cpu-test.sh [low|high|both]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOAD_TEST_SCRIPT="$BASE_DIR/load-test/load-test-events-cpu.js"
COMPOSE_BASE="$BASE_DIR/docker-compose.yml"
COMPOSE_LOW="$BASE_DIR/docker-compose.cpu-low.yml"
COMPOSE_HIGH="$BASE_DIR/docker-compose.cpu-high.yml"

# Default values
MODE="${1:-both}"
BASE_URL="${BASE_URL:-http://localhost:3003}"

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_dependencies() {
    print_header "Checking Dependencies"

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found"

    if ! command -v k6 &> /dev/null; then
        print_error "k6 is not installed. Install: brew install k6"
        exit 1
    fi
    print_success "k6 found"

    echo ""
}

wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1

    print_info "Waiting for service at $url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            print_success "Service is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done

    echo ""
    print_error "Service failed to start after $max_attempts attempts"
    return 1
}

start_services() {
    local cpu_mode=$1
    local compose_file=""

    if [ "$cpu_mode" = "low" ]; then
        compose_file=$COMPOSE_LOW
        print_header "Starting Services - LOW CPU Mode"
    else
        compose_file=$COMPOSE_HIGH
        print_header "Starting Services - HIGH CPU Mode"
    fi

    print_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_BASE" down > /dev/null 2>&1 || true

    local cpu_mode_upper=$(echo "$cpu_mode" | tr '[:lower:]' '[:upper:]')
    print_info "Starting with $cpu_mode_upper CPU configuration..."
    docker-compose -f "$COMPOSE_BASE" -f "$compose_file" up -d

    echo ""
    print_info "Waiting for event-service to be ready..."
    if ! wait_for_service "$BASE_URL/api/events"; then
        print_error "Failed to start services"
        exit 1
    fi

    echo ""
    print_info "Displaying event-service CPU limits:"
    docker inspect birdie-event-service --format='CPU Limit: {{.HostConfig.NanoCpus}}' | awk '{printf "  CPU Cores: %.1f\n", $3/1000000000}'
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" birdie-event-service

    echo ""
}

run_load_test() {
    local cpu_mode=$1
    local output_prefix=$2
    local cpu_mode_upper=$(echo "$cpu_mode" | tr '[:lower:]' '[:upper:]')

    print_header "Running Load Test - $cpu_mode_upper CPU Mode"

    print_info "Test configuration:"
    echo "  • CPU Mode: $cpu_mode_upper"
    echo "  • Target: $BASE_URL/api/events"
    echo "  • Duration: 5 minutes"
    echo ""

    # Run k6 test
    CPU_MODE="$cpu_mode" BASE_URL="$BASE_URL" k6 run "$LOAD_TEST_SCRIPT"

    # Rename the HTML report
    if [ -f "summary.html" ]; then
        mv summary.html "${output_prefix}-summary.html"
        print_success "Report saved: ${output_prefix}-summary.html"
    fi

    echo ""
}

show_results() {
    print_header "Test Results Summary"

    if [ -f "cpu-low-summary.html" ]; then
        print_success "LOW CPU report: cpu-low-summary.html"
    fi

    if [ -f "cpu-high-summary.html" ]; then
        print_success "HIGH CPU report: cpu-high-summary.html"
    fi

    echo ""
    print_info "To view reports:"
    echo "  open cpu-low-summary.html cpu-high-summary.html"
    echo ""
}

cleanup() {
    print_header "Cleanup"
    print_info "Stopping all services..."
    docker-compose -f "$COMPOSE_BASE" down
    print_success "Cleanup complete"
    echo ""
}

# Main execution
main() {
    print_header "Birdie Event Service - CPU Load Test"
    echo "  Mode: $MODE"
    echo ""

    check_dependencies

    case "$MODE" in
        low)
            start_services "low"
            run_load_test "low" "cpu-low"
            cleanup
            show_results
            ;;
        high)
            start_services "high"
            run_load_test "high" "cpu-high"
            cleanup
            show_results
            ;;
        both)
            # Run LOW CPU test
            start_services "low"
            run_load_test "low" "cpu-low"

            print_info "Waiting 10 seconds before starting HIGH CPU test..."
            sleep 10
            echo ""

            # Run HIGH CPU test
            start_services "high"
            run_load_test "high" "cpu-high"

            cleanup
            show_results
            ;;
        *)
            print_error "Invalid mode: $MODE"
            echo "Usage: $0 [low|high|both]"
            exit 1
            ;;
    esac

    print_success "All tests completed!"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT INT TERM

main

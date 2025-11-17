#!/bin/bash

# Local Environment Integration Status Test
# Validates all components of the OperaStudio Local Environment Assistant

set -e

echo "=================================================="
echo "OperaStudio Local Environment Assistant"
echo "Integration Status Validation"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

# Configuration
DB_URL="${DATABASE_URL:-postgresql://postgres:devpassword@localhost:5433/operastudio}"
REDIS_URL="${REDIS_URL:-redis://localhost:6380}"
WS_PORT="${WS_PORT:-8082}"
API_PORT="${API_PORT:-3000}"

# Helper function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}✗${NC} $message"
        ALL_CHECKS_PASSED=false
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}!${NC} $message"
    elif [ "$status" = "info" ]; then
        echo -e "${BLUE}ℹ${NC} $message"
    fi
}

# Helper function to check if port is listening
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Helper function to check Docker container
check_docker_container() {
    local container_name=$1
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        return 0
    else
        return 1
    fi
}

echo "Step 1: Infrastructure Services"
echo "================================="

# Check PostgreSQL
echo -n "Checking PostgreSQL container... "
if check_docker_container "operastudio-postgres" || docker ps | grep -q postgres; then
    print_status "pass" "PostgreSQL container is running"
    
    # Test database connection
    echo -n "  Testing database connection... "
    if docker exec $(docker ps | grep postgres | head -1 | awk '{print $1}') psql -U postgres -d operastudio -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "pass" "Database connection successful"
        
        # Check if schema exists
        echo -n "  Checking database schema... "
        TABLE_COUNT=$(docker exec $(docker ps | grep postgres | head -1 | awk '{print $1}') psql -U postgres -d operastudio -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('agent_credentials', 'tool_execution_logs');" 2>/dev/null | tr -d ' ')
        if [ "$TABLE_COUNT" -ge "2" ]; then
            print_status "pass" "Required tables exist ($TABLE_COUNT/2)"
        else
            print_status "fail" "Missing required tables (found $TABLE_COUNT/2)"
        fi
    else
        print_status "fail" "Cannot connect to database"
    fi
else
    print_status "fail" "PostgreSQL container is not running"
    echo "    Start with: docker run -d --name operastudio-postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=operastudio -p 5433:5432 postgres:15"
fi

echo ""

# Check Redis
echo -n "Checking Redis container... "
if check_docker_container "operastudio-redis" || docker ps | grep -q redis; then
    print_status "pass" "Redis container is running"
    
    # Test Redis connection
    echo -n "  Testing Redis connection... "
    if docker exec $(docker ps | grep redis | head -1 | awk '{print $1}') redis-cli ping >/dev/null 2>&1; then
        print_status "pass" "Redis connection successful"
        
        # Check Redis info
        echo -n "  Checking Redis status... "
        REDIS_INFO=$(docker exec $(docker ps | grep redis | head -1 | awk '{print $1}') redis-cli INFO server 2>/dev/null | grep redis_version || echo "")
        if [ ! -z "$REDIS_INFO" ]; then
            REDIS_VERSION=$(echo "$REDIS_INFO" | head -1 | cut -d: -f2 | tr -d '\r')
            print_status "pass" "Redis version: $REDIS_VERSION"
        fi
    else
        print_status "fail" "Cannot connect to Redis"
    fi
else
    print_status "fail" "Redis container is not running"
    echo "    Start with: docker run -d --name operastudio-redis -p 6380:6379 redis:7-alpine"
fi

echo ""
echo "Step 2: Application Services"
echo "============================="

# Check WebSocket Server
echo -n "Checking WebSocket Server (port $WS_PORT)... "
if check_port $WS_PORT; then
    print_status "pass" "WebSocket server is running on port $WS_PORT"
    
    # Try to connect to health endpoint if available
    echo -n "  Testing WebSocket server health... "
    if command -v curl >/dev/null 2>&1; then
        HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$WS_PORT/health 2>/dev/null || echo "000")
        if [ "$HTTP_RESPONSE" = "200" ]; then
            print_status "pass" "Health check endpoint responding"
        else
            print_status "warn" "Health check endpoint not available (HTTP $HTTP_RESPONSE)"
        fi
    fi
else
    print_status "fail" "WebSocket server is not running on port $WS_PORT"
    echo "    Start with: cd websocket-server && pnpm dev"
fi

echo ""

# Check Next.js API Server
echo -n "Checking Next.js API Server (port $API_PORT)... "
if check_port $API_PORT; then
    print_status "pass" "Next.js API server is running on port $API_PORT"
    
    # Test API endpoint
    echo -n "  Testing API endpoint... "
    if command -v curl >/dev/null 2>&1; then
        HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$API_PORT/api/agent/status 2>/dev/null || echo "000")
        if [ "$HTTP_RESPONSE" = "401" ] || [ "$HTTP_RESPONSE" = "200" ]; then
            print_status "pass" "Status API endpoint responding (HTTP $HTTP_RESPONSE - auth required)"
        elif [ "$HTTP_RESPONSE" = "000" ]; then
            print_status "warn" "Cannot reach API endpoint"
        else
            print_status "warn" "Unexpected response (HTTP $HTTP_RESPONSE)"
        fi
    fi
else
    print_status "fail" "Next.js API server is not running on port $API_PORT"
    echo "    Start with: pnpm dev"
fi

echo ""
echo "Step 3: Integration Status"
echo "=========================="

# Check Redis agent registry
echo -n "Checking Redis agent registry... "
if check_docker_container "operastudio-redis" || docker ps | grep -q redis; then
    REDIS_CONTAINER=$(docker ps | grep redis | head -1 | awk '{print $1}')
    if [ ! -z "$REDIS_CONTAINER" ]; then
        # Count registered agents
        AGENT_COUNT=$(docker exec $REDIS_CONTAINER redis-cli --scan --pattern "agent:*:server" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$AGENT_COUNT" -gt "0" ]; then
            print_status "pass" "Found $AGENT_COUNT registered agent(s)"
            
            # List registered agents
            echo "  Registered agents:"
            docker exec $REDIS_CONTAINER redis-cli --scan --pattern "agent:*:server" 2>/dev/null | while read key; do
                USER_ID=$(echo $key | sed 's/agent:\(.*\):server/\1/')
                SERVER_ID=$(docker exec $REDIS_CONTAINER redis-cli GET "$key" 2>/dev/null)
                echo "    - User: $USER_ID → Server: $SERVER_ID"
            done
        else
            print_status "info" "No agents currently registered"
        fi
    else
        print_status "warn" "Cannot access Redis container"
    fi
else
    print_status "warn" "Redis not available for registry check"
fi

echo ""

# Check database credentials
echo -n "Checking database credentials... "
if check_docker_container "operastudio-postgres" || docker ps | grep -q postgres; then
    POSTGRES_CONTAINER=$(docker ps | grep postgres | head -1 | awk '{print $1}')
    if [ ! -z "$POSTGRES_CONTAINER" ]; then
        CREDENTIAL_COUNT=$(docker exec $POSTGRES_CONTAINER psql -U postgres -d operastudio -t -c "SELECT COUNT(*) FROM agent_credentials;" 2>/dev/null | tr -d ' ')
        if [ ! -z "$CREDENTIAL_COUNT" ]; then
            print_status "pass" "Found $CREDENTIAL_COUNT credential(s) in database"
            
            # Show active credentials
            ACTIVE_COUNT=$(docker exec $POSTGRES_CONTAINER psql -U postgres -d operastudio -t -c "SELECT COUNT(*) FROM agent_credentials WHERE status = 'connected';" 2>/dev/null | tr -d ' ')
            if [ "$ACTIVE_COUNT" -gt "0" ]; then
                echo "  Active connections: $ACTIVE_COUNT"
            fi
        else
            print_status "warn" "Cannot query credentials table"
        fi
    else
        print_status "warn" "Cannot access PostgreSQL container"
    fi
else
    print_status "warn" "PostgreSQL not available for credentials check"
fi

echo ""
echo "Step 4: Environment Configuration"
echo "=================================="

# Check environment variables
echo -n "Checking environment variables... "
ENV_VARS_OK=true

if [ -f ".env.local" ]; then
    print_status "pass" ".env.local file exists"
    
    # Check for required vars
    if grep -q "DATABASE_URL" .env.local 2>/dev/null; then
        print_status "pass" "  DATABASE_URL configured"
    else
        print_status "warn" "  DATABASE_URL not found in .env.local"
        ENV_VARS_OK=false
    fi
    
    if grep -q "REDIS_URL" .env.local 2>/dev/null; then
        print_status "pass" "  REDIS_URL configured"
    else
        print_status "warn" "  REDIS_URL not found in .env.local"
        ENV_VARS_OK=false
    fi
else
    print_status "warn" ".env.local file not found"
    ENV_VARS_OK=false
fi

if [ "$ENV_VARS_OK" = false ]; then
    echo "    Create .env.local with:"
    echo "      DATABASE_URL=$DB_URL"
    echo "      REDIS_URL=$REDIS_URL"
    echo "      NEXT_PUBLIC_WS_URL=ws://localhost:$WS_PORT"
fi

echo ""
echo "Step 5: Summary"
echo "==============="

if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Your local environment integration is ready."
    echo ""
    echo "Next steps:"
    echo "  1. Ensure WebSocket server is running: cd websocket-server && pnpm dev"
    echo "  2. Ensure Next.js API is running: pnpm dev"
    echo "  3. Start a local agent: cd local-agent && pnpm dev"
    echo "  4. Test agent status via API: curl http://localhost:$API_PORT/api/agent/status"
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Please fix the issues above before proceeding."
    echo ""
    echo "Quick start commands:"
    echo "  # Start PostgreSQL:"
    echo "  docker run -d --name operastudio-postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=operastudio -p 5433:5432 postgres:15"
    echo ""
    echo "  # Start Redis:"
    echo "  docker run -d --name operastudio-redis -p 6380:6379 redis:7-alpine"
    echo ""
    echo "  # Apply database schema:"
    echo "  docker exec -i \$(docker ps | grep postgres | awk '{print \$1}') psql -U postgres -d operastudio < database/schema.sql"
    echo ""
    echo "  # Start WebSocket server:"
    echo "  cd websocket-server && pnpm dev"
    echo ""
    echo "  # Start Next.js API:"
    echo "  pnpm dev"
    exit 1
fi


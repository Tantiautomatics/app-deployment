#!/bin/bash
# Production Server Startup Script for Linux/Mac

echo "Starting Tanti Projects Backend Server..."
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set production environment variables
export HOST=${HOST:-0.0.0.0}
export PORT=${PORT:-8010}
export WORKERS=${WORKERS:-4}

# Start the server
python3 start_server.py


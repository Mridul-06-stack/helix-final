#!/bin/bash

echo "=== Checking API Server Status ==="
echo ""

# Check if port 8000 is in use
echo "1. Checking if port 8000 is in use:"
if lsof -i :8000 > /dev/null 2>&1; then
    echo "✓ Port 8000 is IN USE (API server is running)"
    lsof -i :8000
else
    echo "✗ Port 8000 is FREE (API server is NOT running)"
fi

echo ""
echo "2. Testing API endpoint:"
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "✓ API server responds to requests"
    curl -s http://localhost:8000 | jq . 2>/dev/null || curl -s http://localhost:8000
else
    echo "✗ API server does NOT respond"
fi

echo ""
echo "3. Checking for Python processes:"
ps aux | grep -i uvicorn | grep -v grep || echo "No uvicorn processes found"

echo ""
echo "=== Instructions ==="
if ! lsof -i :8000 > /dev/null 2>&1; then
    echo "API server is NOT running. Start it with:"
    echo "  cd /home/arpit/Desktop/hackathon_projects/helix-final"
    echo "  ./start-api.sh"
fi

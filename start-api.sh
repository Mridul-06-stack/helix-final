#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Add ai-agent to PYTHONPATH so imports work correctly
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start the API server from project root
echo "Starting HelixVault API server..."
cd ai-agent
python -m uvicorn api.main:app --reload --port 8000 --host 0.0.0.0

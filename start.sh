#!/bin/bash
# Start PlanMaster
cd "$(dirname "$0")"
source venv/bin/activate
echo "Starting PlanMaster..."
echo "Open http://localhost:5000 in your browser"
python app.py

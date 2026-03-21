#!/bin/bash
cd "$(dirname "$0")"
echo "================================================"
echo "  NSAALP - National Skill Alignment Portal"
echo "================================================"
echo ""
echo "Installing dependencies..."
python3 -m pip install Flask pdfminer.six pdfplumber pypdf --quiet 2>/dev/null || \
  pip3 install Flask pdfminer.six pdfplumber pypdf --quiet 2>/dev/null
echo "Starting server..."
echo "Open: http://127.0.0.1:5000"
echo "Press Ctrl+C to stop."
echo ""
python3 backend/app.py

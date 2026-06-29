#!/usr/bin/env python3
"""
NSAALP — Launcher
Run locally: python run.py
Deployment: gunicorn run:app
"""

import os
from backend.app import app


# Project root
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(PROJECT_ROOT)


if __name__ == "__main__":
    print("=" * 50)
    print("  NSAALP — Starting")
    print("=" * 50)

    print("  Server running at:")
    print("  http://127.0.0.1:5000")
    print("\n  Press Ctrl+C to stop\n")

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )

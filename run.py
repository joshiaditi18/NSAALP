#!/usr/bin/env python3
"""
NSAALP — Quick launcher. Run: python run.py
Works on Windows, Mac, and Linux from any directory.
"""
import sys
import os
import subprocess

# Always run from project root regardless of where this script is called from
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(PROJECT_ROOT)

PKGS = [
    ("flask",      "flask",        "Flask"),
    ("pdfminer",   "pdfminer.six", "pdfminer.six"),
    ("pdfplumber", "pdfplumber",   "pdfplumber"),
    ("pypdf",      "pypdf",        "pypdf"),
]

def install_missing():
    missing = []
    for imp, pkg, _ in PKGS:
        try:
            __import__(imp)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"Installing: {', '.join(missing)}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet"] + missing)
        print("Done.\n")

def main():
    print("=" * 50)
    print("  NSAALP — Starting")
    print("=" * 50)
    if sys.version_info < (3, 8):
        print("ERROR: Need Python 3.8+")
        sys.exit(1)
    
    install_missing()
    
    app = os.path.join(PROJECT_ROOT, "backend", "app.py")
    print(f"  Open browser: http://127.0.0.1:5000")
    print(f"  Press Ctrl+C to stop\n")
    
    # Use subprocess so it works on all platforms
    try:
        subprocess.run([sys.executable, app], cwd=PROJECT_ROOT)
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    main()

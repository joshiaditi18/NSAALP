@echo off
title NSAALP Server
cd /d "%~dp0"

echo ================================================
echo   NSAALP - National Skill Alignment Portal
echo ================================================
echo.

echo Checking Python...
python --version 2>nul
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo.
echo Installing/updating dependencies...
python -m pip install Flask pdfminer.six pdfplumber pypdf --quiet

echo.
echo Starting server...
echo Open your browser at: http://127.0.0.1:5000
echo Press Ctrl+C to stop the server.
echo.

python backend\app.py

echo.
echo Server stopped.
pause

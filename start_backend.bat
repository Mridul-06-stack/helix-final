@echo off
echo Starting HelixVault Backend...
cd /d "%~dp0"
"..\.venv\Scripts\python.exe" -m uvicorn ai-agent.api.main:app --reload --port 8000
if errorlevel 1 (
    echo.
    echo Error starting backend. check if .venv exists in parent directory.
    pause
)

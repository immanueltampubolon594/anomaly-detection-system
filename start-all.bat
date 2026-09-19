@echo off
echo Menyalakan semua server...

start "Agent 2" cmd /k "cd decision-agent && venv\Scripts\activate && python server.py"
timeout /t 2 /nobreak >nul

start "Agent 3" cmd /k "cd response-agent && venv\Scripts\activate && python server.py"
timeout /t 2 /nobreak >nul

start "Traffic Server" cmd /k "cd detection-agent && venv\Scripts\activate && python traffic_server.py"
timeout /t 2 /nobreak >nul

start "Frontend" cmd /k "cd frontend && npm run dev"

echo Semua server sedang dinyalakan.
pause
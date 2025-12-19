@echo off
echo ========================================
echo Tanti Project Management Application
echo ========================================
echo.
echo Starting Backend Server on port 8010...
cd /d %~dp0
start "Backend Server - Port 8010" cmd /k "cd /d %~dp0backend && python server.py"
timeout /t 5 /nobreak >nul
echo.
echo Starting Frontend Server on port 3000...
start "Frontend Server - Port 3000" cmd /k "cd /d %~dp0frontend && npm start"
echo.
echo ========================================
echo Both servers are starting in separate windows
echo ========================================
echo.
echo Backend API: http://localhost:8010
echo Frontend App: http://localhost:3000
echo.
echo Login Credentials:
echo   Email: admin@tantiautomatics.com
echo   Password: admin123
echo.
echo Wait for both servers to finish starting before accessing the app.
echo You can close this window - servers will continue running.
echo.
pause


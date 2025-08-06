@echo off
REM filepath: d:\Coding\Magang\wsb-report\quick-start.bat
REM Simple WSB Dashboard Launcher - No frills version

title WSB Report Dashboard - Quick Start

echo ========================================
echo    WSB Report Dashboard Quick Start    
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found! Please install from https://nodejs.org/
    echo.
    pause
    exit
)
echo Node.js: OK

REM Check directory
if not exist "backend\server.js" (
    echo ERROR: backend\server.js not found!
    echo Make sure you're running this from the wsb-report directory.
    echo.
    pause
    exit
)

REM Install dependencies
echo.
echo Installing dependencies...
cd backend
if not exist "node_modules" (
    echo Running npm install...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit
    )
)

REM Kill existing processes on port 3002
echo.
echo Checking port 3002...
netstat -ano | findstr :3002 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Stopping existing processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
    timeout /t 2 >nul
)

REM Start server
echo.
echo Starting WSB Dashboard...
echo Backend server will open in a new window.
echo.
start "WSB Backend" cmd /k "echo WSB Backend Server & echo. & echo Dashboard: http://localhost:3002 & echo Press Ctrl+C to stop server & echo. & node server.js"

REM Wait and open browser
echo Waiting for server to start...
timeout /t 5 >nul

echo Opening dashboard in browser...
start http://localhost:3002

cd ..

echo.
echo SUCCESS! WSB Report Dashboard is running!
echo.
echo Dashboard: http://localhost:3002
echo Backend: Running in separate window
echo.
echo To stop: Close the backend server window or press Ctrl+C
echo.
pause
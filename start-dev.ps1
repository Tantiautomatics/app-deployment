# Tanti Project Management - Development Startup Script
# This script starts both backend and frontend servers

Write-Host "🚀 Starting Tanti Project Management..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
$pythonInstalled = $false
try {
    $pythonVersion = python --version 2>&1
    $pythonInstalled = $true
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if MongoDB is running
$mongoRunning = $false
try {
    $mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -eq 'Running') {
        $mongoRunning = $true
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB service not running. Attempting to start..." -ForegroundColor Yellow
        Start-Service MongoDB
        Start-Sleep -Seconds 2
        $mongoRunning = $true
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ MongoDB not installed or service not found!" -ForegroundColor Red
    Write-Host "Please install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# Install backend dependencies if needed
Write-Host "📦 Checking backend dependencies..." -ForegroundColor Cyan
$backendDepsInstalled = Test-Path "backend\*.pyc"
if (-not (python -c "import fastapi" 2>$null)) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    cd backend
    python -m pip install -r requirements.txt
    cd ..
}

# Install frontend dependencies if needed
Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "🔧 Starting Backend Server (Port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python server.py"
Start-Sleep -Seconds 3

# Start frontend in a new window  
Write-Host "🎨 Starting Frontend Server (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

# Give CRA a moment to boot, then open the browser automatically
Start-Sleep -Seconds 5
try {
  Write-Host "🌐 Opening http://localhost:3000 in your default browser..." -ForegroundColor Cyan
  Start-Process "http://localhost:3000"
} catch {}

Write-Host ""
Write-Host "✅ Both servers starting!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Backend: http://localhost:8010" -ForegroundColor Yellow
Write-Host "📊 API Docs: http://localhost:8010/docs" -ForegroundColor Yellow
Write-Host "🎨 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "📋 Milestones Grid: http://localhost:3000/milestones" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


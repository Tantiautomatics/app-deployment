Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Tanti Web App - Complete Setup" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found! Please install Python first." -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Cyan
cd backend
pip install fastapi uvicorn sqlalchemy python-dotenv pyjwt bcrypt python-multipart email-validator
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Some packages may have failed to install" -ForegroundColor Yellow
}

# Check if frontend node_modules exists
cd ..
Write-Host "`n📦 Checking frontend dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

# Start backend server
Write-Host "`n🚀 Starting Backend Server (Port 8010)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; `$env:PYTHONPATH = '.'; python -m uvicorn server:app --host 0.0.0.0 --port 8010"

Start-Sleep -Seconds 3

# Start frontend server
Write-Host "🚀 Starting Frontend Server (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm start"

Start-Sleep -Seconds 5

Write-Host "`n✅ Both servers are starting!" -ForegroundColor Green
Write-Host "`n📊 Backend: http://localhost:8010" -ForegroundColor Yellow
Write-Host "📊 Health Check: http://localhost:8010/health" -ForegroundColor Yellow
Write-Host "🎨 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "`n⏳ Please wait 10-15 seconds for servers to fully start..." -ForegroundColor Cyan
Write-Host "Then refresh your browser at http://localhost:3000`n" -ForegroundColor White



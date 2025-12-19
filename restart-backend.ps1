# Restart Backend Server Script
Write-Host "Stopping existing Python server processes..." -ForegroundColor Yellow

# Find and stop Python processes running server.py
$processes = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*server.py*" -or $_.Path -like "*python*"
}

if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "Stopping process ID: $($proc.Id)" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location backend
Start-Process python -ArgumentList "server.py" -WindowStyle Normal
Write-Host "Backend server started! Check the new window." -ForegroundColor Green
Write-Host "Server should be running on http://localhost:8010" -ForegroundColor Cyan


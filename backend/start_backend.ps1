Write-Host "`n🚀 Starting Backend Server on http://localhost:8010...`n" -ForegroundColor Cyan
$env:PYTHONPATH = "."
python -m uvicorn server:app --host 0.0.0.0 --port 8010

# Check billing and deploy to Cloud Run
$env:PATH = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin;$env:PATH"

Write-Host "`n🔍 Checking if billing is enabled...`n" -ForegroundColor Cyan

# Try to enable services (this will fail if billing is not enabled)
$result = gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com --project=update-project-475006 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Billing is enabled! APIs activated.`n" -ForegroundColor Green
    
    # Set environment variables
    $env:PROJECT_ID = "update-project-475006"
    $env:REGION = "us-central1"
    $env:SERVICE_NAME = "tanti-app"
    
    Write-Host "🚀 Starting deployment...`n" -ForegroundColor Green
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  PROJECT_ID: $env:PROJECT_ID" -ForegroundColor White
    Write-Host "  REGION: $env:REGION" -ForegroundColor White
    Write-Host "  SERVICE_NAME: $env:SERVICE_NAME`n" -ForegroundColor White
    
    # Run deployment using Git Bash (for bash script)
    if (Test-Path "C:\Program Files\Git\bin\bash.exe") {
        & "C:\Program Files\Git\bin\bash.exe" -c "export PROJECT_ID='$env:PROJECT_ID' REGION='$env:REGION' SERVICE_NAME='$env:SERVICE_NAME' && ./deploy.sh"
    } else {
        Write-Host "⚠️  Git Bash not found. Please install Git for Windows or run:" -ForegroundColor Yellow
        Write-Host "    bash deploy.sh" -ForegroundColor White
    }
} else {
    Write-Host "❌ Billing is not yet enabled.`n" -ForegroundColor Red
    Write-Host "Please enable billing at:" -ForegroundColor Yellow
    Write-Host "  https://console.cloud.google.com/billing/linkedaccount?project=update-project-475006`n" -ForegroundColor White
    Write-Host "Then run this script again: .\check-and-deploy.ps1" -ForegroundColor Cyan
}


# Fix 405 Method Not Allowed Error

## Problem
The backend server is running but was started **before** the PUT endpoint was added, so it doesn't have the new route.

## Quick Fix (Choose One Method):

### Method 1: Manual Restart (Recommended)
1. **Find the terminal window** where the backend server is running
2. **Press `Ctrl + C`** to stop it
3. **Restart it:**
   ```powershell
   cd backend
   python server.py
   ```

### Method 2: Using PowerShell (Kill and Restart)
```powershell
# Stop existing Python processes
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start the server
cd backend
python server.py
```

### Method 3: Use the Restart Script
```powershell
.\restart-backend.ps1
```

## Verify It's Working

After restarting, you should see in the server logs:
```
Starting Tanti Project Management API...
Database: SQLite (tanti.db)
INFO:     Uvicorn running on http://0.0.0.0:8010
```

Then test in the browser:
1. Go to `http://localhost:3000/projects/1`
2. Try changing the project status
3. The 405 error should be gone! ✅

## What Was Fixed

✅ Created `ProjectUpdate` Pydantic model  
✅ Added PUT endpoint `/api/projects/{project_id}`  
✅ Endpoint properly registered in FastAPI  
✅ Frontend code is correct  

**The only thing needed is to restart the server to load the new endpoint!**


# Tanti Project Management - Setup Guide

## 🚨 Prerequisites Installation

### 1. Install Python (Required for Backend)

**For Windows:**
1. Download Python from https://www.python.org/downloads/
2. Run the installer and **make sure to check** "Add Python to PATH"
3. Verify installation:
   ```powershell
   python --version
   ```
   Should show: Python 3.x.x

### 2. Install MongoDB (Required for Database)

**For Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Complete" installation
4. Check "Install MongoDB as a Service"
5. The service should start automatically

**Verify MongoDB is running:**
```powershell
# Check if MongoDB service is running
Get-Service MongoDB
```

### 3. Node.js and npm (Already Installed ✅)
- Node.js: v22.21.0
- npm: 10.9.4

---

## 📦 Setup Steps

### Step 1: Install Backend Dependencies

```powershell
cd backend
python -m pip install -r requirements.txt
```

**If you encounter permission errors:**
```powershell
python -m pip install -r requirements.txt --user
```

### Step 2: Verify Environment Variables

Check that `.env` file exists in `backend/`:
```powershell
Get-Content backend\.env
```

Should show:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=tanti_db
JWT_SECRET=supersecretkey
JWT_ALGORITHM=HS256
CORS_ORIGINS=http://localhost:3000
```

### Step 3: Install Frontend Dependencies

```powershell
cd frontend
npm install
```

### Step 4: Start MongoDB Service

```powershell
# Start MongoDB service
Start-Service MongoDB

# Or if it's already running:
# Get-Service MongoDB
```

### Step 5: Start Backend Server

```powershell
cd backend
python server.py
```

Or using uvicorn directly:
```powershell
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Backend will run on:** http://localhost:8001

### Step 6: Start Frontend Server

**In a new terminal:**
```powershell
cd frontend
npm start
```

**Frontend will run on:** http://localhost:3000

---

## 🎯 New Milestones Grid Feature

### What's New?

A comprehensive Excel-like milestone tracking grid has been added:

- **Location:** `/milestones` route
- **Features:**
  - Real-time checkbox updates
  - Auto-save to database
  - Progress percentage calculation
  - Color-coded rows (Green=Completed, Yellow=In Progress, Orange=On Hold, Red=At Risk)
  - Horizontal scrolling for all 10 milestones
  - Pinned columns for project details

### Backend Endpoints

- `GET /api/milestones/grid` - Get all milestone grid data
- `PUT /api/milestones/grid/{id}` - Update a single cell
- `POST /api/milestones/grid` - Create new row

---

## 🐛 Troubleshooting

### Python Not Found
```
Python was not found; run without arguments to install from the Microsoft Store
```
**Solution:** Install Python from python.org (see Step 1 above)

### MongoDB Connection Error
```
pymongo.errors.ServerSelectionTimeoutError
```
**Solution:** 
1. Check if MongoDB service is running: `Get-Service MongoDB`
2. Start the service: `Start-Service MongoDB`

### Port Already in Use
If port 8001 or 3000 is already in use:
- Backend: Change port in `server.py` or use `--port` flag
- Frontend: React will prompt to use a different port

### Module Not Found
If backend dependencies are missing:
```powershell
cd backend
python -m pip install -r requirements.txt
```

---

## 📊 Accessing the Application

Once both servers are running:

1. **Frontend:** http://localhost:3000
2. **Backend API:** http://localhost:8001
3. **API Docs:** http://localhost:8001/docs

### Default Login Credentials
- Email: admin@tantiprojects.com
- Password: admin123
- Role: Admin

---

## 🎨 Features Implemented

✅ **Excel-like Milestones Grid**
- All 10 milestones with sub-columns
- Real-time checkbox updates
- Progress calculation
- Color-coded rows
- Export to CSV/Excel

✅ **Backend API**
- FastAPI with async MongoDB
- JWT authentication
- All CRUD endpoints
- Progress auto-calculation

✅ **Frontend**
- React 19 with modern UI
- AG Grid for Excel-like experience
- Real-time updates
- Search and filter

---

## 🚀 Next Steps

1. Install Python and MongoDB (if not done)
2. Run the setup commands above
3. Access the Milestones page at http://localhost:3000/milestones
4. Start tracking projects!








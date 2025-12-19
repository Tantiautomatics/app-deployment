# Resource Consumption Analysis - Tanti Project Management System

## 📊 Storage Consumption Analysis

### **Source Code Storage**

#### Frontend (React Application)
- **Source Files**: ~23 JavaScript files + 46 JSX component files
- **Key Large Files**:
  - `Documents.js`: ~2,749 lines (~150 KB)
  - `ProjectWorkspace.js`: ~1,441 lines (~80 KB)
  - `MilestonesGrid.js`: ~648 lines (~35 KB)
  - `Dashboard.js`: ~481 lines (~25 KB)
  - Other pages: ~200-360 lines each
- **Total Source Code**: ~15,000+ lines of code
- **Estimated Source Size**: **~500 KB - 1 MB** (uncompressed)

#### Backend (Python/FastAPI)
- **Python Files**: 9 files
- **Main Server**: `server.py` (~1,156+ lines)
- **Database Models**: `models.py`
- **Database Files**: SQLite (`tanti.db`) + MongoDB support
- **Estimated Source Size**: **~200-300 KB**

#### Dependencies & Build Artifacts

**Frontend Dependencies (node_modules)**:
- **React 19.0.0** + **React DOM**: ~150 MB
- **AG Grid Community** + **AG Grid React**: ~50 MB
- **Radix UI Components** (30+ packages): ~80 MB
- **Other Dependencies**:
  - `recharts`: ~15 MB
  - `react-router-dom`: ~5 MB
  - `axios`: ~2 MB
  - `tailwindcss`: ~10 MB
  - `lucide-react`: ~5 MB
  - Other utilities: ~30 MB
- **Total node_modules**: **~350-450 MB** (typical for React projects)

**Backend Dependencies (Python packages)**:
- **FastAPI** + **Uvicorn**: ~15 MB
- **SQLAlchemy**: ~10 MB
- **Pandas** + **NumPy**: ~150 MB (large scientific libraries)
- **Boto3** (AWS SDK): ~30 MB
- **Motor** (MongoDB async): ~5 MB
- **Other packages**: ~20 MB
- **Total Python packages**: **~230-250 MB**

**Build Artifacts**:
- Frontend build (`frontend/build/`): **~5-15 MB** (compressed production build)
- Python `__pycache__`: **~1-2 MB**

**Uploaded Files**:
- Current uploads: ~5 files (PDFs, images, PPTX)
- Estimated: **~5-10 MB** (varies with usage)

### **Total Storage Consumption**

| Component | Size Range |
|-----------|-----------|
| Source Code | 1-2 MB |
| Frontend Dependencies (node_modules) | 350-450 MB |
| Backend Dependencies (Python packages) | 230-250 MB |
| Build Artifacts | 5-15 MB |
| Database Files | 1-50 MB (grows with data) |
| Uploaded Files | 5-10 MB (grows with usage) |
| **TOTAL (Development)** | **~600-800 MB** |
| **TOTAL (Production - without node_modules)** | **~250-350 MB** |

---

## 🧠 RAM (Memory) Consumption Analysis

### **Development Environment**

#### Frontend (React Dev Server)
- **React Dev Server**: ~150-200 MB
- **Webpack/Bundler**: ~100-150 MB
- **Browser (Chrome/Firefox)**: ~300-500 MB per tab
- **Total Frontend Dev**: **~550-850 MB**

#### Backend (Python/FastAPI)
- **Python Interpreter**: ~30-50 MB
- **FastAPI/Uvicorn Server**: ~50-80 MB
- **SQLAlchemy ORM**: ~20-30 MB
- **Database Connection Pool**: ~10-20 MB
- **Loaded Modules**: ~30-50 MB
- **Total Backend**: **~140-230 MB**

#### Database
- **SQLite**: Minimal (~5-10 MB, file-based)
- **MongoDB** (if used): ~100-200 MB base + data in memory
- **Total Database**: **~5-200 MB** (depends on usage)

#### **Total Development RAM**: **~700 MB - 1.3 GB**

### **Production Environment**

#### Frontend (Built/Static)
- **Browser Memory** (loaded app): ~50-150 MB
- **AG Grid** (when grid is loaded): ~30-50 MB
- **React Runtime**: ~20-30 MB
- **Total Frontend**: **~100-230 MB**

#### Backend (Production Server)
- **Uvicorn Workers** (1-4 workers): ~80-200 MB per worker
- **Database Connections**: ~20-40 MB
- **Cached Data**: ~50-200 MB (depends on caching)
- **Total Backend**: **~150-440 MB** (single worker: ~150-200 MB)

#### **Total Production RAM**: **~250-670 MB** (single user)
- **With 10 concurrent users**: ~500 MB - 1.2 GB
- **With 50 concurrent users**: ~1.5 GB - 3 GB

---

## ⚡ CPU Consumption Analysis

### **Development Environment**

#### Frontend
- **Webpack Compilation** (initial): High CPU (~50-80% for 10-30 seconds)
- **Hot Module Replacement (HMR)**: Low-Medium (~5-15% during saves)
- **Idle**: Minimal (~1-2%)

#### Backend
- **Python Startup**: Medium CPU (~30-50% for 2-5 seconds)
- **Request Processing**: Low-Medium (~5-20% per request)
- **Database Queries**: Low (~2-10% per query)
- **Idle**: Minimal (~0.5-1%)

#### **Total Development CPU**: 
- **Idle**: ~1-3%
- **Active Development**: ~10-30% (average)
- **Build/Compilation**: ~50-80% (temporary spikes)

### **Production Environment**

#### Frontend (Client-Side)
- **Initial Load**: Medium CPU (~20-40% for 2-5 seconds)
- **Rendering/Interactions**: Low (~2-10%)
- **AG Grid Operations** (sorting/filtering): Medium (~10-25%)
- **Idle**: Minimal (~0.5-1%)

#### Backend (Server-Side)
- **Request Handling**: Low-Medium (~5-15% per request)
- **Database Operations**: Low (~2-8% per query)
- **File Uploads/Processing**: Medium-High (~20-50% during upload)
- **Idle**: Minimal (~0.5-2%)

#### **Total Production CPU**:
- **Idle Server**: ~1-3%
- **Light Load** (1-10 users): ~5-15%
- **Medium Load** (10-50 users): ~15-40%
- **Heavy Load** (50+ users): ~40-80%

---

## 📈 Scalability Estimates

### **Storage Growth**
- **Database**: ~1-5 MB per 100 projects (with milestones, documents)
- **Uploads**: Varies significantly (documents, images, PDFs)
- **Logs**: ~10-50 MB per month (depending on logging level)

### **RAM Growth**
- **Linear with concurrent users**: ~50-100 MB per active user
- **Database caching**: Grows with frequently accessed data
- **File caching**: Grows with uploaded files in memory

### **CPU Growth**
- **Mostly linear with request volume**
- **AG Grid operations**: CPU intensive for large datasets (1000+ rows)
- **File processing**: High CPU during uploads/conversions

---

## 🎯 Recommendations

### **Minimum System Requirements**

**Development**:
- **RAM**: 4 GB (8 GB recommended)
- **Storage**: 2 GB free space
- **CPU**: Dual-core 2.0 GHz (Quad-core recommended)

**Production (Small Scale - <50 users)**:
- **RAM**: 2 GB (4 GB recommended)
- **Storage**: 10 GB (50 GB recommended for growth)
- **CPU**: 2 vCPU cores (4 cores recommended)

**Production (Medium Scale - 50-200 users)**:
- **RAM**: 4-8 GB
- **Storage**: 50-100 GB
- **CPU**: 4-8 vCPU cores

### **Optimization Opportunities**

1. **Reduce Frontend Bundle Size**:
   - Code splitting for routes
   - Tree-shaking unused dependencies
   - Lazy loading AG Grid modules

2. **Backend Optimization**:
   - Database query optimization
   - Implement caching (Redis)
   - Connection pooling

3. **Storage Optimization**:
   - Compress uploaded files
   - Use CDN for static assets
   - Database cleanup/archiving

---

## 📝 Summary

| Metric | Development | Production (Small) | Production (Medium) |
|--------|-------------|-------------------|---------------------|
| **Storage** | 600-800 MB | 250-350 MB | 1-5 GB |
| **RAM** | 700 MB - 1.3 GB | 250-670 MB | 1.5-3 GB |
| **CPU (Idle)** | 1-3% | 1-3% | 1-3% |
| **CPU (Active)** | 10-30% | 5-15% | 15-40% |

**Note**: These are estimates based on typical usage patterns. Actual consumption may vary based on:
- Number of concurrent users
- Data volume
- File upload frequency
- Database size
- Caching strategies




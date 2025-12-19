# Cloud Migration Guide

This guide explains how to migrate from local storage (SQLite + local files) to cloud storage and external databases.

## Table of Contents
1. [Migrating to External Database](#1-migrating-to-external-database)
2. [Migrating to Cloud Storage (AWS S3)](#2-migrating-to-cloud-storage-aws-s3)
3. [Environment Variables Setup](#3-environment-variables-setup)
4. [Code Changes Required](#4-code-changes-required)

---

## 1. Migrating to External Database

### Option A: PostgreSQL (Recommended)

#### Step 1: Install PostgreSQL Driver
```bash
pip install psycopg2-binary
```

#### Step 2: Create PostgreSQL Database
```sql
CREATE DATABASE tanti_projects;
CREATE USER tanti_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tanti_projects TO tanti_user;
```

#### Step 3: Update Environment Variables
```bash
DB_TYPE=postgresql
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_NAME=tanti_projects
DB_USER=tanti_user
DB_PASSWORD=your_password
```

#### Step 4: Update `backend/database.py`
Replace the content with `database_cloud.py` or update it to use environment variables.

### Option B: MySQL

#### Step 1: Install MySQL Driver
```bash
pip install pymysql
```

#### Step 2: Create MySQL Database
```sql
CREATE DATABASE tanti_projects;
CREATE USER 'tanti_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tanti_projects.* TO 'tanti_user'@'%';
FLUSH PRIVILEGES;
```

#### Step 3: Update Environment Variables
```bash
DB_TYPE=mysql
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_NAME=tanti_projects
DB_USER=tanti_user
DB_PASSWORD=your_password
```

### Option C: MongoDB (NoSQL)

If you want to use MongoDB instead of SQL:

1. Install dependencies:
```bash
pip install motor pymongo
```

2. Update `database.py` to use MongoDB connection
3. Convert SQLAlchemy models to MongoDB documents

---

## 2. Migrating to Cloud Storage (AWS S3)

### Step 1: Create AWS S3 Bucket

1. Go to AWS Console → S3
2. Create a new bucket (e.g., `tanti-project-files`)
3. Configure bucket permissions:
   - Block public access: Enable (for security)
   - Create IAM user with S3 access

### Step 2: Create IAM User for S3 Access

1. Go to AWS IAM → Users → Create User
2. Attach policy: `AmazonS3FullAccess` (or create custom policy)
3. Create Access Key (save Access Key ID and Secret Access Key)

### Step 3: Update Environment Variables
```bash
STORAGE_TYPE=s3
S3_BUCKET=tanti-project-files
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
```

### Step 4: Update Code

The `storage_service.py` file handles both local and S3 storage automatically based on `STORAGE_TYPE` environment variable.

---

## 3. Environment Variables Setup

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DB_TYPE=postgresql  # or "mysql" or "sqlite"
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=tanti_projects
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Storage Configuration
STORAGE_TYPE=s3  # or "local"
S3_BUCKET=tanti-project-files
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Loading Environment Variables

Update `server.py` to load from `.env`:

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## 4. Code Changes Required

### A. Update `backend/database.py`

Replace with the content from `database_cloud.py` or modify existing:

```python
# Use database_cloud.py instead of database.py
# Or update database.py to read from environment variables
```

### B. Update `backend/server.py`

#### Change 1: Import storage service
```python
from storage_service import StorageService
```

#### Change 2: Update file upload endpoint
Replace the `upload_design_deliverable` function:

```python
@api_router.post("/design-deliverables/upload")
async def upload_design_deliverable(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    deliverable_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        project_id_int = int(project_id)
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")
        
        # Read file content
        content = await file.read()
        
        # Upload using storage service (handles local or S3)
        saved_url = await StorageService.upload_file(
            file_content=content,
            file_name=file.filename,
            folder="design-deliverables"
        )
        
        # Save metadata to database
        deliverable = DesignDeliverable(
            project_id=project_id_int,
            type=deliverable_type,
            name=file.filename,
            url=saved_url,  # This will be S3 URL or local path
            version=1,
            uploaded_by=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(deliverable)
        db.commit()
        db.refresh(deliverable)
        return DesignDeliverableResponse.from_orm(deliverable)
    except Exception as e:
        logging.error(f"Error uploading design deliverable: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload: {str(e)}")
```

#### Change 3: Update file download endpoint
```python
@api_router.get("/design-deliverables/{deliverable_id}/download")
async def download_design_deliverable(
    deliverable_id: int,
    db: Session = Depends(get_db)
):
    deliverable = db.query(DesignDeliverable).filter(
        DesignDeliverable.id == deliverable_id
    ).first()
    
    if not deliverable:
        raise HTTPException(status_code=404, detail="Design deliverable not found")
    
    try:
        # Get file content from storage (local or S3)
        file_content = await StorageService.download_file(deliverable.url)
        
        # Return file response
        from fastapi.responses import Response
        return Response(
            content=file_content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{deliverable.name}"'
            }
        )
    except Exception as e:
        logging.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download: {str(e)}")
```

#### Change 4: Update StaticFiles mount (only for local storage)
```python
# Only mount StaticFiles if using local storage
if os.environ.get("STORAGE_TYPE", "local") == "local":
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

### C. Update `requirements.txt`

Add database drivers if needed:

```txt
# For PostgreSQL
psycopg2-binary>=2.9.0

# For MySQL
pymysql>=1.0.0

# For MongoDB (if switching)
motor>=3.3.0
pymongo>=4.5.0

# AWS S3 (already included)
boto3>=1.34.129

# Environment variables (already included)
python-dotenv>=1.0.1
```

---

## 5. Migration Steps Summary

### For Database Migration:

1. **Backup existing SQLite database**
   ```bash
   sqlite3 tanti.db .dump > backup.sql
   ```

2. **Set up external database** (PostgreSQL/MySQL)

3. **Update environment variables**

4. **Update `database.py`** to use `database_cloud.py`

5. **Run migrations** (tables will be created automatically)

6. **Import data** (if needed, use SQL dump or migration script)

### For Cloud Storage Migration:

1. **Create S3 bucket and IAM user**

2. **Set environment variables**

3. **Update `server.py`** to use `StorageService`

4. **Test file upload/download**

5. **Migrate existing files** (optional script to upload existing files to S3)

---

## 6. Testing the Migration

### Test Database Connection:
```python
# Test script
from database_cloud import engine, get_db
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
    print("Database connected successfully!")
```

### Test S3 Connection:
```python
# Test script
from storage_service import StorageService
import asyncio

async def test_s3():
    test_content = b"test file content"
    url = await StorageService.upload_file(
        test_content,
        "test.txt",
        "test-folder"
    )
    print(f"File uploaded to: {url}")

asyncio.run(test_s3())
```

---

## 7. Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use IAM roles** instead of access keys when possible (for AWS)
3. **Rotate credentials** regularly
4. **Use environment-specific configurations**
5. **Enable database SSL** for production
6. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault)

---

## 8. Cost Considerations

### AWS S3 Pricing:
- Storage: ~$0.023 per GB/month
- Requests: ~$0.005 per 1,000 requests
- Data transfer: Varies by region

### Database Hosting Options:
- **AWS RDS PostgreSQL**: ~$15-100/month
- **DigitalOcean Managed Database**: ~$15/month
- **Heroku Postgres**: ~$9-50/month
- **Supabase**: Free tier available

---

## Need Help?

- Check AWS S3 documentation: https://docs.aws.amazon.com/s3/
- PostgreSQL documentation: https://www.postgresql.org/docs/
- SQLAlchemy documentation: https://docs.sqlalchemy.org/





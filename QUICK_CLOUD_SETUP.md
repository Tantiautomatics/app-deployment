# Quick Cloud Setup Guide

## 🚀 Quick Start: Migrate to Cloud Storage & External Database

### Step 1: Install Additional Dependencies

```bash
cd backend
pip install psycopg2-binary  # For PostgreSQL
# OR
pip install pymysql  # For MySQL
```

### Step 2: Create `.env` File

Create `backend/.env` file with your configuration:

```env
# Database (choose one)
DB_TYPE=postgresql
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=tanti_projects
DB_USER=your_user
DB_PASSWORD=your_password

# Storage
STORAGE_TYPE=s3
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

### Step 3: Update Code Files

1. **Replace `database.py`** with `database_cloud.py`:
   ```bash
   mv backend/database.py backend/database_old.py
   mv backend/database_cloud.py backend/database.py
   ```

2. **Update `server.py`** imports:
   ```python
   # Add at the top
   from dotenv import load_dotenv
   from storage_service import StorageService
   
   load_dotenv()  # Load environment variables
   ```

3. **Update file upload endpoint** in `server.py` (see CLOUD_MIGRATION_GUIDE.md)

### Step 4: Test

```bash
# Test database connection
python -c "from database import engine; print('DB OK')"

# Test S3 connection
python -c "from storage_service import StorageService; print('S3 OK')"
```

---

## 📋 Environment Variables Reference

### For PostgreSQL:
```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tanti_projects
DB_USER=postgres
DB_PASSWORD=password123
```

### For MySQL:
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tanti_projects
DB_USER=root
DB_PASSWORD=password123
```

### For AWS S3:
```env
STORAGE_TYPE=s3
S3_BUCKET=tanti-project-files
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

---

## 🔄 Migration Checklist

- [ ] Install database driver (psycopg2-binary or pymysql)
- [ ] Create external database
- [ ] Create S3 bucket (if using cloud storage)
- [ ] Set up IAM user for S3 access
- [ ] Create `.env` file with credentials
- [ ] Update `database.py` to use `database_cloud.py`
- [ ] Update `server.py` to use `StorageService`
- [ ] Test database connection
- [ ] Test file upload/download
- [ ] Run migration script (if migrating existing files)

---

## 💡 Tips

1. **Start with database migration first**, then storage
2. **Test locally** before deploying to production
3. **Backup your SQLite database** before migrating
4. **Use environment variables** - never hardcode credentials
5. **Test file upload/download** after switching to S3

---

## 🆘 Troubleshooting

### Database Connection Issues:
- Check firewall rules
- Verify credentials
- Ensure database exists
- Check network connectivity

### S3 Upload Issues:
- Verify IAM permissions
- Check bucket name and region
- Verify access keys are correct
- Check bucket policy

---

For detailed instructions, see `CLOUD_MIGRATION_GUIDE.md`





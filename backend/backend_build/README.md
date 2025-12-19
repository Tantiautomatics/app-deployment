# Tanti Projects Backend - Production Build

## ✅ Build Status: **PRODUCTION READY**

This is a production-ready build of the Tanti Projects backend API server.

## 📦 Contents

- `server.py` - Main FastAPI application
- `database.py` - Database configuration and connection
- `models.py` - SQLAlchemy database models
- `init_db.py` - Database initialization script
- `requirements.txt` - Python dependencies
- `tanti.db` - SQLite database (if using SQLite)
- `uploads/` - Uploaded files directory
- `start_server.py` - Production server startup script
- `.env.example` - Environment variables template

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   ```

3. **Initialize database (if needed):**
   ```bash
   python init_db.py
   ```

4. **Start the server:**

   **Windows:**
   ```bash
   start_server.bat
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x start_server.sh
   ./start_server.sh
   ```
   
   **Or directly:**
   ```bash
   python start_server.py
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8010)
- `WORKERS` - Number of worker processes (default: 4)
- `JWT_SECRET` - Secret key for JWT tokens (CHANGE IN PRODUCTION!)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### Production Settings

For production deployment:

1. **Change JWT_SECRET** - Use a strong, random secret key
2. **Set WORKERS** - Adjust based on your server capacity (typically 2-4x CPU cores)
3. **Configure CORS** - Set ALLOWED_ORIGINS to your frontend domain(s)
4. **Use HTTPS** - Deploy behind a reverse proxy (nginx/Apache) with SSL
5. **Database** - Consider using PostgreSQL or MySQL for production

## 🌐 API Endpoints

- **API Base URL:** `http://localhost:8010/api`
- **API Documentation:** `http://localhost:8010/docs`
- **Alternative Docs:** `http://localhost:8010/redoc`

## 📁 Directory Structure

```
backend build/
├── server.py              # Main application
├── database.py            # Database configuration
├── models.py              # Database models
├── init_db.py             # Database initialization
├── requirements.txt       # Dependencies
├── start_server.py        # Production startup script
├── start_server.bat       # Windows startup script
├── start_server.sh        # Linux/Mac startup script
├── .env.example           # Environment template
├── README.md              # This file
├── tanti.db               # SQLite database (if used)
└── uploads/               # Uploaded files directory
    ├── design-deliverables/
    └── documents/
```

## 🔒 Security Notes

1. **Never commit `.env` file** - It contains sensitive information
2. **Change JWT_SECRET** - Use a strong, random secret in production
3. **Use HTTPS** - Always use SSL/TLS in production
4. **Set proper CORS** - Only allow your frontend domain(s)
5. **Database Security** - Use strong passwords and restrict access
6. **File Uploads** - Validate and sanitize all uploaded files

## 🐳 Docker Deployment (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8010

CMD ["python", "start_server.py"]
```

## 📊 Monitoring

- Check server logs for errors
- Monitor database size and performance
- Set up health check endpoints
- Use process managers like PM2 or supervisor

## 🆘 Troubleshooting

### Port already in use
```bash
# Change PORT in .env or use a different port
PORT=8011 python start_server.py
```

### Database errors
```bash
# Reinitialize database
python init_db.py
```

### Import errors
```bash
# Ensure all dependencies are installed
pip install -r requirements.txt
```

## 📝 Notes

- The server runs on port 8010 by default
- SQLite database is included for development/testing
- For production, consider migrating to PostgreSQL or MySQL
- Uploads directory must be writable by the server process

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-01-27


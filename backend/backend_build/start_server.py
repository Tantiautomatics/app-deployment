#!/usr/bin/env python3
"""
Production Server Startup Script
Starts the FastAPI server using uvicorn with production settings
"""
import uvicorn
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Production configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8010"))
    workers = int(os.getenv("WORKERS", "4"))
    
    # Run with multiple workers for production
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        workers=workers,
        log_level="info",
        access_log=True,
        reload=False  # Disable reload in production
    )


# Multi-stage build for Tanti Project Management System
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Set backend URL to empty string for relative URLs (same origin)
ENV REACT_APP_BACKEND_URL=""

# Build the React app
RUN npm run build

# Stage 2: Python backend with static frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create uploads directory
RUN mkdir -p backend/uploads/design-deliverables backend/uploads/documents

# Expose port (Cloud Run will set $PORT, default to 8080)
ENV PORT=8080
EXPOSE 8080

# Use uvicorn for production (ASGI server for FastAPI)
CMD cd backend && exec uvicorn server:app \
    --host 0.0.0.0 \
    --port $PORT \
    --workers 1


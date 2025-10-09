# Multi-stage build for production optimization  
FROM --platform=linux/amd64 node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN rm -rf node_modules package-lock.json
RUN npm install

COPY frontend/ ./
RUN npm run build

# Python backend
FROM python:3.11-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy Python dependencies
COPY pyproject.toml ./
COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && 
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend (if needed for serving)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Change ownership to non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
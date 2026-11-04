# syntax=docker/dockerfile:1
# Three images from one file: `frontend` (nginx + built single-page app), `backend` (Django API and Celery workers).

# ---- build the single-page app
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- web server: serves the app and proxies /api/ to the backend
FROM nginx:1.27-alpine AS frontend
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# ---- backend: API (gunicorn) and workers (celery), same code and dependencies
FROM python:3.13-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.production
WORKDIR /srv/ramascene
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY manage.py ./
COPY ramasceneMasterProject/ ramasceneMasterProject/
COPY ramascene/ ramascene/
COPY python_ini/ python_ini/
COPY docker/entrypoint.sh /entrypoint.sh
RUN useradd --system --uid 10001 ramascene && mkdir /srv/data && chown ramascene /srv/data \
    && chmod +x /entrypoint.sh
USER ramascene
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "ramasceneMasterProject.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]

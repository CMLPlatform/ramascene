# RaMa-Scene
---
RaMa-Scene is a **Django 4.2** web application for analyzing Environmentally Extended Input-Output (EEIO) tables using **EXIOBASE v3.3**. The platform provides interactive visualization and scenario modeling for circular economy analysis.

Demo version: http://cml.liacs.nl:8080/ramascene/

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](resources/docs/CONTRIBUTING.md)

# Developers Guide
---
Full documentation: http://rama-scene.readthedocs.io/en/latest/

# Technology Stack
---

| Component | Version | Notes |
|-----------|---------|-------|
| **Python** | 3.11+ | Upgraded from 3.6 |
| **Django** | 4.2 LTS | Upgraded from 2.1 |
| **Django Channels** | 4.0.x | Upgraded from 2.1.5 |
| **Node.js** | 18 LTS | Upgraded from 12 |
| **React** | 18.2.x | Upgraded from 16.2.0 |
| **Webpack** | 5.88.x | Upgraded from 3.11.0 |
| **Bootstrap** | 5.3.x | Upgraded from 3.3.7 |
| **Celery** | 5.3.x | Upgraded from 4.1.0 |

# Getting Started
---

## Prerequisites

### 1. Retrieve the raw datasets

Download **EXIOBASE-Rama-Scene** (modified version including secondary materials):
http://doi.org/10.5281/zenodo.3533196

Rabbitmq installation

---

## Option A: Running Without Docker (Development)

### Step 1: Setup Python Environment
**Python 3.11+ required**

```bash
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Setup Node.js Environment
**Node.js 18+ and npm 8+ required**

```bash
npm install
./node_modules/.bin/webpack --config dev-webpack.config.js
```

### Step 3: Set Environment Variables
```bash
export DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev
export DATASETS_VERSION=v3
export DATASETS_DIR=/path/to/your/datasets
```

### Step 4: Setup Database
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py populateHierarchies
```

### Step 5: Start Services
```bash
# Option 1: Native services
redis-server &
rabbitmq-server &

# Option 2: Docker services (recommended)
docker run -d -p 6379:6379 --name redis-dev redis:7.2-alpine
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq-dev rabbitmq:3.12-management-alpine
```

### Step 6: Start Application
```bash
python manage.py runserver
```
**URL:** http://127.0.0.1:8000/ramascene/

### Step 7: Start Celery Workers (Optional)
```bash
# Analyser worker
celery -A ramasceneMasterProject worker -l info --concurrency 1 --queues calc_default -n worker1.%h

# Modeller worker
celery -A ramasceneMasterProject worker -l info --concurrency 1 --queues modelling -n worker2.%h
```

---

## Option B: Running With Docker

### Production Mode
```bash
# Build all images with latest changes
docker-compose build --no-cache

# Start all services
# This includes: Nginx (port 80), Daphne (port 8000), Redis, RabbitMQ, Celery
docker-compose up -d

# Wait for initialization (30-60 seconds)
sleep 30
```
**URL:** http://localhost:80/

> **⚠️ IMPORTANT:** Use port **80** (Nginx), NOT port 8000 (Daphne directly). 
> Daphne does **NOT** serve static files. Nginx handles all static file serving.

### Development Mode
```bash
# Use development settings
export DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev
export DATASETS_DIR=/path/to/datasets

# Build and start
docker-compose build --no-cache
docker-compose up -d
```
**URL:** http://localhost:80/

---

## Configuration Reference

### Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `DJANGO_SETTINGS_MODULE` | Django settings module | Yes | `ramasceneMasterProject.config.production` |
| `DATASETS_VERSION` | Dataset version identifier | Yes | `v3` |
| `DATASETS_DIR` | Path to EXIOBASE datasets | Yes | - |
| `HOST` | Application host | No | `www.ramascene.eu` |
| `WS_HOST` | WebSocket host | No | `www.ramascene.eu` |
| `PROTOCOL` | HTTP protocol | No | `http` |
| `WS_PROTOCOL` | WebSocket protocol | No | `ws` |
| `SECRET_KEY` | Django secret key | Yes | - |
| `OPENBLAS_NUM_THREADS` | NumPy thread count | No | - |

---

## Troubleshooting

### Common Issues & Solutions

**Issue: "No application configured for scope type 'http'"**
- **Cause**: Django Channels 4.x requires explicit HTTP routing
- **Fix**: Already fixed in `routing.py` - ensure Docker containers are rebuilt

**Issue: "Invalid HTTP_HOST header: 'localhost:8000'"**
- **Cause**: Host not in ALLOWED_HOSTS
- **Fix**: Already fixed - 'localhost' added to ALLOWED_HOSTS in both dev and production settings

**Issue: Static files not loading (404 errors)**
- **Cause**: Daphne does NOT serve static files directly
- **Solution 1**: Use Nginx (port 80) - **RECOMMENDED**
- **Solution 2**: Add Whitenoise: `pip install whitenoise` and add to MIDDLEWARE
- **Solution 3**: Use Django dev server: `python manage.py runserver`

**Issue: Webpack build errors**
- **Fix**: 
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ./node_modules/.bin/webpack --config dev-webpack.config.js
  ```

**Issue: Docker build fails**
- **Fix**: Clean build with latest changes:
  ```bash
  docker-compose down -v
  docker-compose build --no-cache
  docker-compose up -d
  ```

---

## Architecture

### Without Docker (Development)
```
Browser → Django Dev Server:8000 → React App
              ↓
        Serves static files
```

### With Docker (Production)
```
Browser → Nginx:80 → Daphne:8000 → Django
     ↓              ↓
Serves static    ASGI server
```

---

## Core Dependencies
---
- **Backend**: Django 4.2, Django Channels 4.0, Celery 5.3
- **Frontend**: React 18, Webpack 5, Bootstrap 5
- **Infrastructure**: Redis, RabbitMQ, Nginx

---

## Quick Start Summary

### Without Docker:
```bash
git clone https://bitbucket.org/CML-IE/rama-scene.git
cd rama-scene
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
npm install
./node_modules/.bin/webpack --config dev-webpack.config.js
export DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev
export DATASETS_DIR=/path/to/datasets
python manage.py migrate
python manage.py populateHierarchies
python manage.py runserver
# Open: http://127.0.0.1:8000/ramascene/
```

### With Docker:
```bash
git clone https://bitbucket.org/CML-IE/rama-scene.git
cd rama-scene
docker-compose build --no-cache
docker-compose up -d
# Open: http://localhost:80/
```

---

*Last updated: September 2026*
*Python: 3.11 | Django: 4.2 | Node.js: 18 | React: 18*
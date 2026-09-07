# --- TARGET node ---
ARG NODE_VERSION=18-alpine
ARG PYTHON_VER=3.11-slim
ARG NGINX_VERSION=1.25-alpine

FROM node:${NODE_VERSION} AS node

WORKDIR /usr/src/app

# copy sources
COPY package.json package-lock.json webpack.config.js ./ 
COPY --chown=node:node assets ./assets

# install all node packages (including devDependencies)
RUN npm ci

# build reactjs bundle
ARG HOST
ARG WS_HOST
ARG PROTOCOL
ARG WS_PROTOCOL

# Set environment variables for webpack build
ENV HOST=${HOST}
ENV WS_HOST=${WS_HOST}
ENV PROTOCOL=${PROTOCOL}
ENV WS_PROTOCOL=${WS_PROTOCOL}
ENV NODE_ENV=production

RUN ./node_modules/.bin/webpack --config webpack.config.js

# --- END TARGET node ---


# --- TARGET build ---
ARG PYTHON_VER
ARG NGINX_VERSION

FROM python:${PYTHON_VER} AS build

WORKDIR /usr/src/app

# copy all webpack files
COPY --from=node --chown=1000:1000 /usr/src/app/assets/bundles ./assets/bundles
COPY --from=node --chown=1000:1000 /usr/src/app/webpack-stats.json ./

# copy sources
COPY --chown=1000:1000 ramascene ./ramascene
COPY --chown=1000:1000 ramasceneMasterProject ./ramasceneMasterProject
COPY --chown=1000:1000 static_assets ./static_assets
COPY --chown=1000:1000 templates ./templates
COPY --chown=1000:1000 .env manage.py requirements.txt rtd_requirements.txt  ./

# Install all python packages to /usr/local & clean up
RUN pip install --retries 3 --no-cache-dir --disable-pip-version-check --no-python-version-warning -r requirements.txt

# Install gettext
# USER root
# RUN set -ex; \
#     apk add --update --no-cache gettext
# USER wodby

# compile localized strings
# RUN python manage.py compilemessages

# compile all assets
ARG DJANGO_SETTINGS_MODULE
ARG HOST
ARG DATASETS_VERSION
ARG SECRET_KEY
ARG BROKER_URL
ARG PUBLIC_DIR
ARG WS_HOST
ARG PROTOCOL
ARG WS_PROTOCOL
ARG REDIS_HOST
ARG DATABASE_NAME

# Ensure static directory exists and run collectstatic
RUN mkdir -p /usr/src/app/static && \
    python manage.py collectstatic --noinput

# --- END TARGET build ---


# --- TARGET python ---
ARG PYTHON_VER
ARG NGINX_VERSION

FROM python:${PYTHON_VER} AS python

WORKDIR /usr/src/app

ARG DJANGO_SETTINGS_MODULE
ARG HOST
ARG DATASETS_VERSION
ARG SECRET_KEY
ARG BROKER_URL
ARG PUBLIC_DIR
ARG WS_HOST
ARG PROTOCOL
ARG WS_PROTOCOL
ARG REDIS_HOST
ARG DATABASE_NAME

ENV PYTHONUNBUFFERED=1

# create directories
USER root
RUN mkdir -p ./logs /mnt/data /mnt/datasets
RUN chown 1000:1000 ./logs /mnt/data /mnt/datasets
USER 1000

# Copy all packages
COPY --from=build --chown=1000:1000 /usr/local /usr/local
COPY --from=build --chown=1000:1000 /usr/src/app/webpack-stats.json ./

# Copy all source files
COPY --chown=1000:1000 python_ini ./python_ini
COPY --chown=1000:1000 ramascene ./ramascene
COPY --chown=1000:1000 ramasceneMasterProject ./ramasceneMasterProject
COPY --chown=1000:1000 templates ./templates
COPY manage.py .env LICENSE README.md ./

ENV DATABASES_DEFAULT_NAME=/mnt/data/${DATABASE_NAME}
ENV DATASETS_DIR=/mnt/datasets

RUN python manage.py makemigrations
RUN python manage.py migrate
RUN python manage.py populateHierarchies

EXPOSE 8000
CMD ["daphne", "ramasceneMasterProject.asgi:application", "-b", "0.0.0.0", "-p", "8000"]

# --- END TARGET python ---


# --- TARGET reverse proxy ---
ARG NGINX_VERSION

FROM nginx:${NGINX_VERSION} as nginx

RUN { \
        echo "map \$http_upgrade \$connection_upgrade {" ; \
        echo "    default upgrade;" ; \
        echo "    '' close;" ; \
        echo "}" ; \
        echo "server {" ; \
        echo "    listen 80 default_server;" ; \
        echo "    server_name default;" ; \
        echo "    root /var/www/html;" ; \

        echo "    location /ws/ {" ; \
        echo "        proxy_pass http://app_server/;" ; \
        echo "        proxy_http_version 1.1;" ; \
        echo "        proxy_set_header Upgrade \$http_upgrade;" ; \
        echo "        proxy_set_header Connection \$connection_upgrade;" ; \
        echo "        proxy_set_header Host \$http_host;" ; \
        echo "        proxy_redirect off;" ; \
        echo "    }" ; \

        echo "    location / {" ; \
        echo "        try_files \$uri \$uri/ /index.html;" ; \
        echo "    }" ; \
        echo "}" ; \
    } > /etc/nginx/conf.d/ramascene_vhost.conf;

# Copy Django-collected static files (admin, etc.)
COPY --from=build --chown=1000:1000 /usr/src/app/static/ /var/www/html/static/

# Copy Webpack bundles
COPY --from=build --chown=1000:1000 /usr/src/app/assets/bundles/ /var/www/html/static/bundles/

# Copy original static_assets
COPY --from=build --chown=1000:1000 /usr/src/app/static_assets/ /var/www/html/static/

# --- END TARGET nginx ---

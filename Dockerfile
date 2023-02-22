# --- TARGET node ---
ARG NODE_VERSION=12.22-dev
ARG PYTHON_VER=3.6
ARG NGINX_VERSION=1.21

FROM wodby/node:${NODE_VERSION} AS node

# copy sources
COPY package.json yarn.lock webpack.config.js ./
COPY --chown=node:node assets ./assets

# install all node packages
RUN npm install

# build reactjs bundle
ARG HOST
ARG WS_HOST
ARG PROTOCOL
ARG WS_PROTOCOL

RUN ./node_modules/.bin/webpack --config webpack.config.js

# --- END TARGET node ---


# --- TARGET build ---
ARG PYTHON_VER
ARG NGINX_VERSION

FROM wodby/python:${PYTHON_VER}-dev AS build

# copy all webpack files
COPY --from=node --chown=wodby:wodby /usr/src/app/assets/bundles ./assets/bundles
COPY --from=node --chown=wodby:wodby /usr/src/app/webpack-stats.json ./

# copy sources
COPY --chown=wodby:wodby ramascene ./ramascene
COPY --chown=wodby:wodby ramasceneMasterProject ./ramasceneMasterProject
COPY --chown=wodby:wodby static_assets ./static_assets
COPY --chown=wodby:wodby templates ./templates
COPY --chown=wodby:wodby .env manage.py requirements.txt rtd_requirements.txt  ./

# Install all python packages & clean up
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

RUN python manage.py collectstatic

# --- END TARGET build ---


# --- TARGET python ---
ARG PYTHON_VER
ARG NGINX_VERSION

FROM wodby/python:${PYTHON_VER} AS python

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
RUN install -o wodby -g wodby -d ./logs
RUN install -o wodby -g wodby -d /mnt/data
RUN install -o wodby -g wodby -d /mnt/datasets
USER wodby

# Copy all packages
COPY --from=build --chown=wodby:wodby /home/wodby/.local /home/wodby/.local
COPY --from=build --chown=wodby:wodby /usr/src/app/webpack-stats.json ./

# Copy all source files
COPY --chown=wodby:wodby python_ini ./python_ini
COPY --chown=wodby:wodby ramascene ./ramascene
COPY --chown=wodby:wodby ramasceneMasterProject ./ramasceneMasterProject
COPY --chown=wodby:wodby templates ./templates
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

FROM wodby/nginx:${NGINX_VERSION} as nginx

RUN { \
        echo "map \$http_upgrade \$connection_upgrade {" ; \
        echo "    default upgrade;" ; \
        echo "    '' close;" ; \
        echo "}" ; \
        echo "include upstream.conf;" ; \
        echo "server {" ; \
        echo "    listen 80 default_server;" ; \
        echo "    server_name default;" ; \
        echo "    root /var/www/html;" ; \
        echo "    include preset.conf;" ; \

        echo "    location /ws/ {" ; \
        echo "        proxy_pass http://app_server/;" ; \
        echo "        proxy_http_version 1.1;" ; \
        echo "        proxy_set_header Upgrade \$http_upgrade;" ; \
        echo "        proxy_set_header Connection \$connection_upgrade;" ; \
        echo "        proxy_set_header Host \$http_host;" ; \
        echo "        proxy_redirect off;" ; \
        echo "    }" ; \

        echo "    include defaults.conf;" ; \
        echo "}" ; \
    } > /etc/nginx/conf.d/ramascene_vhost.conf;

# Copy all static files
COPY --from=build --chown=wodby:wodby /usr/src/app/public/ /var/www/html/

# --- END TARGET nginx ---

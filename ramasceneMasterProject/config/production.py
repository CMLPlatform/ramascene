"""Production settings. Everything that differs per server comes from the environment (see .env.example)."""
from .base import *

DEBUG = False

# Comma separated host names the site answers to, for example "ramascene.example.org"
ALLOWED_HOSTS = [host.strip() for host in os.environ["HOST"].split(",") if host.strip()]

# Folder with the dataset (one sub folder per year) and the version that names the binaries
DATASET_DIR = os.environ["DATASETS_DIR"]
DATASET_VERSION = os.environ["DATASETS_VERSION"]

SECRET_KEY = os.environ["SECRET_KEY"]

# Celery broker, for example amqp://USER:PASSWORD@broker:5672/VHOST
CELERY_BROKER_URL = os.environ["BROKER_URL"]

# nginx terminates TLS (or a proxy in front of it) and passes the original protocol on
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}

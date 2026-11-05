##########
Deployment
##########

The application runs as a Docker Compose stack. The file ``docker-compose.yml`` in the root folder defines it.

Containers
==========

``web``
    nginx. It serves the built frontend and it proxies ``/api/`` to the
    ``api`` container. Only this container publishes a port (8080). Put TLS in front of it, with a reverse proxy
    or the nginx of the host.

``api``
    Gunicorn with the Django REST API. At start it applies the migrations and loads the classifications
    (``RUN_MIGRATIONS=1``).

``worker-calc``
    A Celery worker for the ``calc_default`` queue (baseline calculations).

``worker-modelling``
    A Celery worker for the ``modelling`` queue (scenarios). It has a memory cap, ``MODELLING_MEM_LIMIT``.

``broker``
    RabbitMQ, the Celery message broker.

The images come from one ``Dockerfile`` with these targets: ``frontend`` (nginx and the built single-page application) and ``backend`` (Django and Celery).

Steps
=====

1. Copy ``.env.example`` to ``.env`` and fill in every value. Never commit ``.env``.

   * ``SECRET_KEY``: a long random string.
   * ``HOST``: the domain name of the server.
   * ``DATASETS_DIR``: the folder on the server with the dataset. It is mounted read-only at ``/datasets``.
   * ``DATASETS_VERSION``: the dataset version, for example ``v5``.
   * ``BROKER_URL`` and the ``RABBITMQ_*`` values: the broker address and its credentials.
   * ``RAMASCENE_MAX_ACTIVE_JOBS`` and ``MODELLING_MEM_LIMIT``: see :doc:`performance`.
   * ``DATASET_N_PRODUCTS`` and ``DATASET_N_COUNTRIES``: the size of the dataset.

2. Run ``docker compose up -d --build``.

3. Open ``http://<server>:8080/``. Check that the page loads the catalog and that an analysis completes.

Precalculated analysis
======================

The page shows a precalculated analysis when it opens. The file is ``frontend/public/precalculated.json``.
Run ``python scripts/make_precalculated.py`` again when the dataset changes. Then build the images again.

Automatic deployment
====================

The ``Deploy`` GitHub workflow (``.github/workflows/deploy.yml``) runs ``docker compose up -d --build`` on the
server over SSH. It starts only by hand and uses the ``production`` environment. That environment must require
an approval before the workflow runs.

Limits
======

* The API and the workers share one SQLite file on a Docker volume. This is enough for the expected load. Move to
  PostgreSQL if the number of simultaneous users grows.
* The workers load large matrices. Keep the memory of the server in mind when you raise the concurrency.

Local development
=================

See ``README.md``. ``scripts/dev-up.sh`` starts RabbitMQ in Docker, prepares the database, and starts the API, both
workers, and the frontend.

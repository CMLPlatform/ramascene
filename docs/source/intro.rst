############
Introduction
############

RaMa-Scene is a Django and React web application. It analyses Environmentally Extended Input-Output (EEIO)
tables from EXIOBASE v3.3. The application calculates results on request. It loads the EXIOBASE matrices
into memory and runs the calculations in background workers (Celery).

Implementation overview
=======================

The application has four parts:

* **Frontend.** A single-page application in ``frontend/`` (React, TypeScript, Vite). nginx serves it.
* **API.** Django REST Framework serves the API under ``/api/``. Gunicorn runs it.
* **Workers.** Celery workers run the calculations. RabbitMQ is the message broker.
* **Database.** SQLite stores the classifications and the jobs. A job holds the result of one calculation.

The frontend and the back end talk through HTTP and JSON only. There are no websockets.

Terminology:

* A **job** is a database record. It stores the name, the status, and the result of one calculation.
* A **task** is the Celery process that does the calculation for one job.

Life of a request
=================

1. The frontend sends ``POST /api/jobs/`` with the selection of the user.
2. The API checks the request. It rejects a request that is not valid with HTTP 400.
3. The API refuses new work with HTTP 429 when too many jobs are active.
4. :mod:`ramascene.services` creates a job with status ``started`` and sends a task to Celery.
   Scenario requests go to the ``modelling`` queue. All other requests go to the ``calc_default`` queue.
5. The API returns HTTP 202 with the job id.
6. The worker loads the matrices, runs one of the four routes, and stores the result on the job.
   The status changes to ``completed``, or to ``failed`` when an error occurs.
7. The frontend polls ``GET /api/jobs/<id>/`` until the status is ``completed`` or ``failed``.

Modules
=======

:mod:`ramascene.api` and :mod:`ramascene.serializers`
    The REST views and the validation of requests.

:mod:`ramascene.services`
    Turns a validated request into a job and sends the task to Celery.

:mod:`ramascene.querymanagement`
    Converts the global ids of the frontend into the indices that the calculations use.
    It also loads the numpy matrices from disk.

:mod:`ramascene.tasks`
    The Celery task. It selects the analysis route and stores the result.

:mod:`ramascene.analyze`
    The four analysis routes. See :doc:`calculations`.

:mod:`ramascene.modelling` and :mod:`ramascene.woodbury`
    Scenario changes and the fast update of the Leontief inverse. See :doc:`modelling`.

:mod:`ramascene.models`
    The database models: the classifications and the jobs.

:mod:`ramascene.nuts2`
    The regional (NUTS2) split used by the CircuMAT regions.

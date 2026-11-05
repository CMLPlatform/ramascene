#############
Testing
#############

Backend tests are in ``ramascene/tests/`` and run with pytest. Frontend tests are in ``frontend/src/*.test.ts``
and run with Vitest.

Backend
=======

Run all tests in the root folder:

``$ pytest``

``pytest.ini`` selects the test files and reuses the test database.

* ``test_api_jobs.py`` and ``test_api_catalog.py``: the REST API. They need no dataset.
* ``test_modelling.py`` and ``test_woodbury.py``: scenario changes and the Woodbury update.
* ``test_dimensions.py``, ``test_nuts2.py``, ``test_models.py``, ``test_database_integration.py``: smaller units.
* ``test_validation_analytical.py``: the validation test (see below). It needs the dataset.
* ``test_celery_integration.py``: starts a real Celery worker. It needs RabbitMQ.

The CI workflow (``.github/workflows/ci.yml``) runs the tests that need no dataset and no broker.

Validation test
===============

The validation test checks results against values computed outside the application. The files in
``ramascene/tests/validation_files`` hold one query and the expected result for each of the four routes.
The test sends each query to the job API, runs Celery eagerly, and compares the result with the expected values
within a tolerance.

The reference values in ``validation_files`` come from EXIOBASE 3.3 and no longer apply, so that test is skipped.
Two tests check the current dataset instead: ``test_dataset_consistency.py`` checks the matrices (shapes, the
Leontief inverse, final demand, the stored validation results) and ``test_dataset_job.py`` starts a job through the
API and compares the result with the number computed directly from the matrices. Both are skipped without a
dataset. Set these variables first:

* ``DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev``
* ``DATASETS_DIR``: the folder with the dataset.
* ``DATASETS_VERSION``: the dataset version.

After a test run, restore the database with ``python manage.py populateHierarchies``.

Frontend
========

In ``frontend/``:

* ``npm test``: unit tests.
* ``npm run typecheck``: TypeScript check.
* ``npm run build``: production build.

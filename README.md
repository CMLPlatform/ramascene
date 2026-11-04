# RaMa-Scene

RaMa-Scene analyses Environmentally Extended Input-Output (EEIO) tables. It answers three questions for a
chosen sector and year: the footprint of a sector in a region, the sectors that contribute to it, and the
direct impacts of the sector in each region. Scenario modelling (changing technology or final demand) is
planned. The data is EXIOBASE 3.3, in the RaMa-Scene dataset version v4.

Licence: GPL-3.0. See [LICENSE](LICENSE).

## How it works

- **Frontend:** a single-page app in `frontend/` (React, TypeScript, Vite).
- **API:** Django REST Framework under `/api/`.
  - `GET /api/catalog/` lists the years, products, countries and indicators with their ids.
  - `POST /api/jobs/` starts a calculation and returns a job id (HTTP 202).
  - `GET /api/jobs/<id>/` returns the job status and, when completed, the result.
  - Too many active jobs return HTTP 429.
- **Background work:** Celery workers run the calculations. Results are stored on the job.
- **Numerics:** `ramascene/analyze.py` (the four analysis routes), `ramascene/modelling.py` (scenario
  changes), and `ramascene/woodbury.py` (Sherman–Morrison–Woodbury updates of the Leontief inverse, so a
  scenario does not re-invert the full matrix).

The client polls the job endpoint until the status is `completed` or `failed`. There are no websockets.

## Repository layout

| Path | Contents |
|---|---|
| `ramascene/` | Django app: models, API, Celery tasks, numerical core, tests |
| `ramasceneMasterProject/` | Project settings (`config/`), Celery app, URL routing |
| `frontend/` | React + TypeScript frontend |
| `python_ini/data/` | Hierarchies and indicator tables loaded by `populateHierarchies` |
| `static_assets/` | Static files used by the current pages, including the hierarchy CSVs |
| `docs/` | Sphinx documentation |
| `requirements.txt`, `requirements-dev.txt` | Python dependencies (runtime, and tests) |
| `docker-compose.yml`, `Dockerfile` | Container setup |

The data preparation scripts (turning raw EXIOBASE and geography sources into the CSVs above) live in a
separate repository, `ramascene-preprocessing`. They are not needed to run the app.

## Getting started

### Prerequisites
- Python 3.13
- Node.js 22 or newer
- RabbitMQ (the Celery broker)
- The EXIOBASE dataset, version v4, as binary matrices per year. The data is not in this repository.

### Python environment
```
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

### Configuration
Copy `.env.example` to `.env` and fill in the values. Settings are read from the environment:
- `DJANGO_SETTINGS_MODULE` selects the settings module, for example `ramasceneMasterProject.config.dev`.
- `DATASETS_DIR` is the folder containing the dataset, and `DATASETS_VERSION` is `v4`.
- `BROKER_URL` is the Celery broker.
- `RAMASCENE_MAX_ACTIVE_JOBS` caps the jobs queued or running at once.

Never commit `.env`.

### Database and hierarchies
```
python manage.py migrate
python manage.py populateHierarchies
```

### Run the backend
Start the Celery workers, one per queue, then the development server:
```
celery -A ramasceneMasterProject worker -l info --concurrency 1 --max-tasks-per-child 1 --queues calc_default -n worker1.%h
celery -A ramasceneMasterProject worker -l info --concurrency 1 --max-tasks-per-child 1 --queues modelling -n worker2.%h
python manage.py runserver
```

On macOS, set `export FORKED_BY_MULTIPROCESSING=1` in the terminal that runs the Celery workers. Without it every job fails with `not enough values to unpack (expected 3, got 0)`. `scripts/dev-up.sh` sets it for you.

### Run the frontend
```
cd frontend
npm install
npm run dev
```
The dev server proxies `/api` to the Django server on port 8000.

## Tests

```
pytest
```

- `test_api_jobs.py`, `test_api_catalog.py`, `test_woodbury.py`, `test_modelling.py`: unit tests. They run
  without the dataset, except where a test needs the database.
- `test_validation_analytical.py`: runs the job API against the v3 reference values for 2011. It needs the
  dataset and the populated database, and runs Celery eagerly.
- `test_celery_integration.py`: starts a real Celery worker, so it needs RabbitMQ.

Frontend:
```
cd frontend
npm test
npm run build
```

Afterwards, repopulate the database with `python manage.py populateHierarchies` if a test has changed it.

## Deployment

`docker-compose.yml` defines the reverse proxy, the web app, the calculation and modelling workers, RabbitMQ,
and Redis. Deployment is planned to change: the web app will run under gunicorn and Redis will be removed,
since the app no longer uses Channels. Deployments are approved by the project owner before they go live.

## Licence and contributions

RaMa-Scene is released under the GNU General Public License v3.0. Contributions are welcome through pull
requests on the repository.

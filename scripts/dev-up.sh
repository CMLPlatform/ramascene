#!/usr/bin/env bash
# Start the local RaMa-Scene stack in one go:
# RabbitMQ (Docker), database setup, API, two Celery workers and the frontend.
# Logs go to logs/dev/. Press Ctrl-C to stop the API, workers and frontend.
set -euo pipefail

cd "$(dirname "$0")/.."
LOG_DIR="$(pwd)/logs/dev"
mkdir -p "$LOG_DIR"

[ -d .venv ] || { echo "Missing .venv. Create it first (see README)."; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop first."; exit 1; }

# Load .env, then set the local development values
if [ -f .env ]; then set -a; . ./.env; set +a; fi
export DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev
export DATASETS_DIR="${DATASETS_DIR:-$HOME/Documents/datasets/ramascene-exiobase-3.11.2}"
# The dataset version belongs to the code (v5 = EXIOBASE 3.11.2), so a value left in .env does not win.
export DATASETS_VERSION=v5
# macOS starts Celery pool processes with "spawn", which leaves them without their task
# registry and fails every job with "not enough values to unpack (expected 3, got 0)".
# This setting makes the pool child set it up (Celery's documented workaround).
export FORKED_BY_MULTIPROCESSING=1

source .venv/bin/activate

echo "==> RabbitMQ"
if docker ps -a --format '{{.Names}}' | grep -qx rs-rabbit; then
  docker start rs-rabbit >/dev/null
else
  docker run -d --name rs-rabbit -p 5672:5672 rabbitmq:3 >/dev/null
fi

echo "==> Database"
python manage.py migrate
if [ "$(python manage.py shell -c 'from ramascene.models import Country; print(Country.objects.count())' | tail -1)" = "0" ]; then
  python manage.py populateHierarchies
else
  echo "Hierarchies already loaded, skipping."
fi

if [ ! -d frontend/node_modules ]; then
  echo "==> Installing frontend packages"
  (cd frontend && npm install)
fi

pids=()
cleanup() {
  echo; echo "Stopping API, workers and frontend..."
  kill "${pids[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> API (logs/dev/api.log)"
python manage.py runserver --noreload > "$LOG_DIR/api.log" 2>&1 &
pids+=($!)

echo "==> Workers (logs/dev/worker1.log, worker2.log)"
python -m celery -A ramasceneMasterProject worker -l info --concurrency 1 --max-tasks-per-child 1 --queues calc_default -n worker1.%h > "$LOG_DIR/worker1.log" 2>&1 &
pids+=($!)
python -m celery -A ramasceneMasterProject worker -l info --concurrency 1 --max-tasks-per-child 1 --queues modelling -n worker2.%h > "$LOG_DIR/worker2.log" 2>&1 &
pids+=($!)

echo "==> Frontend (logs/dev/frontend.log)"
(cd frontend && exec npm run dev > "$LOG_DIR/frontend.log" 2>&1) &
pids+=($!)

echo
echo "API check:  http://127.0.0.1:8000/api/catalog/"
echo "App:        http://localhost:5173/"
echo "Live logs:  tail -f logs/dev/worker1.log"
echo "Press Ctrl-C to stop everything."
wait

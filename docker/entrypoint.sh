#!/bin/sh
# Only the API container prepares the database; workers just start (RUN_MIGRATIONS=1 is set for the API only).
set -e
if [ "$RUN_MIGRATIONS" = "1" ]; then
    python manage.py migrate --noinput
    python manage.py populateHierarchies
fi
exec "$@"

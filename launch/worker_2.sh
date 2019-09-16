celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue modelling -n worker2.%h

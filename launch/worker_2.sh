celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queues modelling -n worker2.%h

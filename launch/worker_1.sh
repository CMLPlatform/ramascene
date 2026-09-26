celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queues calc_default -n worker1.%h

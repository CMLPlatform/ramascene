celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue calc_default -n worker1.%h

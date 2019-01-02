#############
Testing
#############

Various tests are implemented for websocket communication, celery background processing, AJAX, views, and the models.
See ramascene/tests/ folder.

============
Unit testing
============

Perform unit tests in the root folder:

``$ python3 manage.py test -v2``


================
Integration test
================

A more extensive validation tests is performed with pytest. Several validation files (CSV)
are prepared from results computed outside of the web-application.
Please refer to ramascene/tests/validation_files for the structure of these files.
Each file contains information to generate a query, send a websocket query, receive results back from Celery.
These results are in turn matched against the validation files expected results with a given tolerance.
Lastly refer to confttest.py to see which scripts are called for performing the test.

To test over the full life cycle of the back-end you can run the following command in the root folder:

``$ pytest -vs``

Make sure to run a celery worker:

``$ celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue calc_default -n worker1.%h``

If the test has succeeded, you'll need to repopulate the database with the following command:

``$ python3 manage.py populateHierarchies``
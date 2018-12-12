##########
Deployment
##########

The web-application deployment process is based on the following documentations and is tested on Ubuntu 16.04 LTS:

1. http://masnun.rocks/2016/11/02/deploying-django-channels-using-daphne/
2. http://channels.readthedocs.io/en/stable/deploying.html
3. https://medium.com/@saurabhpresent/deploying-django-channels-using-supervisor-and-ngnix-2f9a25393eef
4. https://medium.com/@dwernychukjosh/setting-up-nginx-gunicorn-celery-redis-supervisor-and-postgres-with-django-to-run-your-python-73c8a1c8c1ba
5. https://www.vultr.com/docs/installing-and-configuring-supervisor-on-ubuntu-16-04

It is advised to read these guides. See the next sections for an example to get started quickly.

Install Redis [message broker] for Django Channels websocket support
====================================================================

Install redis:
``$ sudo apt-get install redis-server``

Before you create the virtual environment make sure you have python-dev installed via apt-get
Create a virtual environment (python3.5 or higher) and install the following:

| ``$ pip3 install asgi_redis``
| ``$ pip3 install -U channels_redis``

Test redis:

``$ redis-cli ping``

Return value should be : PONG

Make sure redis is a daemon, see redis.conf.

Install Django dependencies & prepare SQLlite
=============================================

In the same virtual env., change directory towards the project root:
``$ pip3 install -r requirements.txt``

Make sure you set the following environment variables (see example-prod-env.sh):

* export DJANGO_SETTINGS_MODULE="ramasceneMasterProject.config.<config filename>"
* export DATASETS_VERSION="<ramascene database version available e.g. v3>"
* export DATASETS_DIR="<my/path/to/datasets>"
* export SECRET_KEY="<django secret key>"
* export BROKER_URL="<default is amqp://localhost>"
* export HOST="<ip or domain>"
* export OPENBLAS_NUM_THREADS=<adjust according to how many cores you want to use>

If you are on Linux and using the OPENBLAS library for Numpy.
It is advised to set the number of threads Numpy uses. To find which library is used in python:

``>>>np.__config__.show()``

*Note: For more information on the OPENBLAS_NUM_THREADS settings see Celery section further down the page.*

Prepare SQLlite:

| ``$ python3 manage.py makemigrations``
| ``$ python3 manage.py migrate``

Create superuser for administration purposes:

``$ python3 manage.py createsuperuser``

Management commands and prepare static resources
================================================

Populating database classifications:

``$ python3 manage.py populateHierarchies``

Install node.js (node version: 3.10.10 or higher), if not already installed:

``$ sudo apt-get install nodejs``

Prepare static resources:

``$ npm install``

Set webpack conf settings for production:

* Configure webpack.config.js for ajax url and websocket url at webpack.DefinePlugin() to your domain.
* Adjust process environment to "production" at webpack.DefinePlugin().
* Configure Dotenv to point to your environment variables if desired. Alternatively remove dotenv section.
* Make sure that new UglifyJsPlugin() is set.

Built React bundle:

``$ ./node_modules/.bin/webpack --config webpack.config.js``

Django collect static:
``$ python3 manage.py collectstatic``

Install and setup nginx [HTTP and Reverse Proxy Server]
=======================================================
Installing nginx requires apache to be stopped temporarily:

``$ sudo service apache2 stop``

Install nginx:

``$ sudo apt-get install nginx``

Configure nginx, make sure proxy_pass is set to this:
``http://0.0.0.0:8001``

See example configuration file :download:`example_nginx <ystatic/example_nginx.conf>`

Check status of nginx:
``$ sudo nginx -t``

Allow Nginx to interact with the host machine on the network:
``$ sudo ufw allow ‘Nginx Full’``

Celery details and setup
========================
Celery is used to delegate long lasting CPU jobs and heavy memory usage for performing IO calculations on the fly.
In this project the message broker rabbitMQ is used. Each user performing a request for calculation
is set in the queue and that task is handled when ready by the Celery consumer.

Installing the rabbitMQ broker:

``$ sudo apt-get install -y erlang``

``$ sudo apt-get install rabbitmq-server``

Then enable and start the RabbitMQ service:

``$ systemctl enable rabbitmq-server``

``$ systemctl start rabbitmq-server``

Check the status to make sure everything is running:
``$ systemctl status rabbitmq-server``

Celery details:

Each Celery worker spawns a number of child processes and these processes use as much memory as it needs.
The first limit to set is the concurrency. It is normally advised to run a single worker per machine and the concurrency
value will define how many processes will run in parallel.
Concurrency set to 1 follows a first in first out principle for users, if concurrency is increased
the server's resources (CPU and MEM) are more extensively used and Celery could handle requests simultaneously. We have for
the RaMa-Scene v0.3 only one single worker for default calculations and a dedicated worker for modeling final demand.

Setting a Celery MEM limit:

Loading numpy objects over different years can causes severe memory use if Python doesn't release memory
after a calculation is finished.
The common idea is that Python does garbage collection and frees up memory once finished.
However during testing it became apparent that memory wasn't released,
refer to https://github.com/celery/celery/issues/3339. The setting implemented in the Django settings.py
is a limit on the number of task handled per child process. If set to 1 a new worker has to be spawned if a tasks is
finished, enforcing the release of memory.

Setting a Numpy limit:

On most linux machines numpy uses the OPENBLAS library. OPENBLAS by default uses all cores available for performing calculations.
By setting the OPENBLAS_NUM_THREADS we limit the amount of cores used, leaving resources available on the server.

*Note: For more information on Celery refer to the performance page in this documentation and the official celery docs.*


Testing the application
=======================
Make sure Daphne is installed and start daphne (in virtualenv):

``$ daphne -b 0.0.0.0 -p 8001 ramasceneMasterProject.asgi:application``

Start the Celery workers in virtual env.:

``$ celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue calc_default -n worker1.%h``

``$ celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue modelling -n worker2.%h``
Be careful with load if you raise concurrency. For final production setup remove the parameter -l info.

Test the application to see if everything is running correct in a web-browser.

Daemonizing
===========
Celery and Daphne need to be deamonized. For example with supervisor. Bare in mind that the environment variables have to be set in the configuration file.
See example configuration file :download:`example_supervisord <ystatic/example_supervisord.conf>`

If you make changes to the file you have to do:

* sudo supervisorctl reread
* sudo supervisorctl update

If you want to stop or start processes:

* sudo supervisorctl stop <program name e.g. celeryd>
* sudo supervisorctl start <program name e.g. celeryd>

Management of database results
==============================
Cron can be used to clear the database results on a regular basis, see example below:

#at 5 a.m on every sunday
``0 5 * * 0``

#delete database contents
``. <path to environment>/env.sh && cd /<proj>/ && /<virtual-env>/bin/python /<proj>/manage.py clear_models``


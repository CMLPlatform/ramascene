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

Make sure you set the following environment variables:
``
| export DJANGO_SETTINGS_MODULE="ramasceneMasterProject.config.<config file name e.g. staging-cml>"
| export DATASETS_VERSION="<ramascene database version available e.g. v3>"
| export DATASETS_DIR="<my/path/to/datasets>"
| export SECRET_KEY="<django secret key>"
| export BROKER_URL="<default is amqp://localhost>"
| export HOST="<ip or domain>"

``
For more information on the secret key refer to https://docs.djangoproject.com/en/2.0/ref/settings/#secret-key

If you wish you can perform unittests and integration tests see testing page. For deployment continue the next steps.

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
* Configure Dotenv to point to your environment variables
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

The Django settings.py is already configured for rabbitMQ use, you can modify the settings if deemed necessary.

Celery CPU use limit:

Each Celery worker spawns a number of child processes and these processes use as much memory as it needs.
The first limit is setting the concurrency to 1 which only spawns 1 child process per worker, hence limiting the CPU
use of the system. Concurrency set to 1 follows a first in first out principle for users, if concurrency is increased
the server's resources (CPU and MEM) are more extensively used and Celery could handle requests simultaneously. We have for
the RaMa-Scene v0.3 only one single worker for default calculations and one for modeling final demand.

Celery MEM limit:

Loading numpy objects over different years can causes severe memory use if Python doesn't release memory
after a calculation is finished.
The common idea is that Python does garbage collection and frees up memory once finished.
However during testing it became apparent that memory wasn't released,
refer to https://github.com/celery/celery/issues/3339. The next setting implemented
was to limit the number of task handled per child process. If set to 1 a new worker has to be spawned if a tasks is
finished, enforcing the release of memory.

*Note: the original Redis broker resulted in bugs when setting the max number of tasks per child, hence a change to the message broker rabbitMQ was used for Celery.*


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
Celery and Daphne need to be deamonized. For example with supervisor. Bare in mind that the environment variables have to be set.
See example configuration file :download:`example_supervisord <ystatic/example_supervisord.conf>`

Management of database results
==============================
Cron can be used to clear the database results on a regular basis, see example below:
#delete database contents at 5 a.m on every sunday
``0 5 * * 0 cd /<path-pr-root>/ && /<path-to-virtual-env>/bin/python /<path-pr-root>/manage.py clear_models``


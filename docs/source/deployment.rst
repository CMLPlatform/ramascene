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

Install Redis [message broker]
==============================

Install redis:
``sudo apt-get install redis-server``

Before you create the virtual environment make sure you have python-dev installed via apt-get
Create a virtual environment (python3.5 or higher) and install the following:

| ``pip3 install asgi_redis``
| ``pip3 install -U channels_redis``

Test redis:

``redis-cli ping``

Return value should be : PONG

Make sure redis is a daemon, see redis.conf.

Install Django dependencies & prepare SQLlite
=============================================

In the same virtual env., change directory towards the project root:
``pip3 install -r requirements.txt``

Change directory to project folder for preparation SQLlite with Django:

| ``python3 manage.py makemigrations``
| ``python3 manage.py migrate``

Create superuser for administration purposes:

``python3 manage.py createsuperuser``

Management commands and prepare static resources
================================================

Populating database classifications:

``python3 manage.py populateHierarchies``

Adjust settings.py in project:

| DATASET_DIR = '<full path to folder containing all raw datasets>'
| DEBUG = False
| ALLOWED_HOSTS = [<domain>]

Adjust settings.secret.py in project to set a secure secret key:
For more information contact the developers or refer to https://docs.djangoproject.com/en/2.0/ref/settings/#secret-key

Install node.js (node version: 3.10.10 or higher), if not already installed:

``sudo apt-get install nodejs``

Prepare static resources:

``$npm install``

Set webpack conf settings for production:

* Configure webpack.config.js for ajax url and websocket url at webpack.DefinePlugin().
* Adjust process environment to "production" at webpack.DefinePlugin().
* Make sure that new UglifyJsPlugin() is set.

Built React bundle:

``./node_modules/.bin/webpack --config webpack.config.js``

Django collect static:
``python3 manage.py collectstatic``

Install and setup nginx [HTTP and Reverse Proxy Server]
=======================================================
Installing nginx requires apache to be stopped temporarily:

``sudo service apache2 stop``

Install nginx:

``sudo apt-get install nginx``

Configure nginx, make sure proxy_pass is set to this:
``http://0.0.0.0:8001``

See example configuration file :download:`example_nginx <ystatic/example_nginx.conf>`

Check status of nginx:
``sudo nginx -t``

Allow Nginx to interact with the host machine on the network:
``sudo ufw allow ‘Nginx Full’``



Setting up Daphne and Celery
============================
Make sure Daphne is installed and start daphne (in virtualenv):

``daphne -b 0.0.0.0 -p 8001 ramasceneMasterProject.asgi:application``

Start Celery in virtual env.:

``celery -A ramasceneMasterProject worker -l info  --concurrency=1 --queue calc_default``

Be careful with load if you raise concurrency.

Test the application to see if everything is running correct in a web-browser.


Daemonizing
===========
Celery and Daphne need to be deamonized. For example with supervisor.
See example configuration file :download:`example_supervisord <ystatic/example_supervisord.conf>`

Management of database results
==============================
Cron can be used to clear the database results on a regular basis, see example below:
#delete database contents at 5 a.m on every sunday
``0 5 * * 0 cd /<path-pr-root>/ && /<path-to-virtual-env>/bin/python /<path-pr-root>/manage.py clear_models``


RaMa-Scene memory usage
=======================

The memory usage of a single query denoting the memory load of numpy objects of a given year is approximately 1.8G.
Meaning that if we set concurrency to 2 the load can be at least 3.6G. Hence a capable server is needed with sufficient
memory and CPU to run this application.
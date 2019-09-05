# RaMa-Scene
---
RaMa-Scene is a django 2.0 based web-application that allows for analyzing Environmentally Extended Input-Output (EEIO) tables. EXIOBASE v3.3 is used in this project. 
Demo version: http://cml.liacs.nl:8080/ramascene/

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](resources/docs/CONTRIBUTING.md)

# Developers Guide
---
http://rama-scene.readthedocs.io/en/latest/

# Getting started
---
### Retrieve the raw datasets

 
* EXIOBASE-Rama-Scene (v3 - unmodified version of EXIOBASE): 

To be updated

* EXIOBASE-Rama-Scene (v4 - modified version including secondary materials): 

https://fdonaticml.stackstorage.com/s/uIzzoDRkX9xH4Nj

### Clone the project 
``` 
git clone https://bitbucket.org/CML-IE/rama-scene.git
```

### Create a virtual environment (python3.5 or higher) and install the app requirements (make sure you have python-dev installed via apt-get)
``` 
$ pip3 install -r requirements.txt 
```

### Install node.js (node version: 3.10.10 or higher)
``` 
$ sudo apt-get update
$ sudo apt-get install nodejs
```
> Note: On debian apt install nodejs-legacy

### Install redis (for Django Channels)
```
$ sudo apt install redis-server
```

### Install rabbitMQ (for Celery)

``$ sudo apt-get install -y erlang``

``$ sudo apt-get install rabbitmq-server``

Then enable and start the RabbitMQ service:

``$ systemctl enable rabbitmq-server``

``$ systemctl start rabbitmq-server``

Check the status to make sure everything is running:
``$ systemctl status rabbitmq-server``


> Note: Perform all next steps in the virtualenv and in the rootfolder of the project

### Set the following environment variables (see sample-dev-env.sh):
```
export DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev
export DATASETS_VERSION=version downloaded e.g. v3
export DATASETS_DIR=my/path/to/datasets
export OPENBLAS_NUM_THREADS=adjust according to how many cores you want to use
```
If you are on Linux and using the OpenBlas library for Numpy. 
It is advised to set the number of threads Numpy uses. To find which library is used in python:
```
>>>import numpy as np
>>>np.__config__.show()
```


### Prepare the database
```
$ python3 manage.py makemigrations
$ python3 manage.py migrate
```

### Populate the database 
```
$ python3 manage.py populateHierarchies
```

### Prepare static resources
```
$ npm install
```

### Built React bundle
```
$ ./node_modules/.bin/webpack --config dev-webpack.config.js 
```

### Start Celery
Start the default module to enable handling of analytical calculations:
```
$ celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue calc_default -n worker1.%h
```
Start the modelling module to enable handling of modelling calculations:
```
$ celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue modelling -n worker2.%h
```

### Start the development server
```
$ python3 manage.py runserver
```

Access the app via the webrowser: http://127.0.0.1:8000/ramascene/

### [Optional] enable debug logging

To enable debug logging, open the ramasceneMasterProject/config/dev.py file.
Uncomment the "logging for Django" section.

### [Optional] run tests
In case you want to run tests you can perform unit tests in the root folder:
```
$ python3 manage.py test -v2
```

For integration tests you need to start the celery workers first (explained above). 
You can perform the integration test with the following command:
```
$ pytest -vs
```

If the test has succeeded, you�ll need to repopulate the database with the following command:
```
$ python3 manage.py populateHierarchies
```

### Core dependencies
---
The app uses Celery [4.1.0] (http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html), Django channels [2.1.5] (https://channels.readthedocs.io/en/latest/)

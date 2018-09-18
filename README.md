# RaMa-Scene
---
RaMa-Scene is a django 2.0 based web-application that allows for analyzing Environmentally Extended Input-Output (EEIO) tables. EXIOBASE v3.3 is used in this project. 
Demo version: http://cml.liacs.nl:8080/ramascene/

# Developers Guide
---
http://rama-scene.readthedocs.io/en/latest/

# Getting started
---
### Retrieve the raw datasets
Visit our data repository at: https://fdonaticml.stackstorage.com/s/1wYNXkJXkIWqXGW

### Clone the project 
``` 
git clone https://SidneyNiccolson@bitbucket.org/CML-IE/rama-scene.git 
```

### Point in settings.py to the datasets downloaded above
Adjust DATASET_DIR

### Create a virtual environment (python3.5 or higher) and install the app requirements (make sure you have python-dev installed via apt-get)
``` 
$pip3 install -r requirements.txt 
```

### Install node.js (node version: 3.10.10 or higher)
``` 
$sudo apt-get update
$sudo apt-get install nodejs
```
> Note: On debian apt install nodejs-legacy

### Install redis (for Django Channels)
```
$sudo apt install redis-server
```

### Install rabbitMQ (for Celery)

``sudo apt-get install -y erlang``

``sudo apt-get install rabbitmq-server``

Then enable and start the RabbitMQ service:

``systemctl enable rabbitmq-server``

``systemctl start rabbitmq-server``

Check the status to make sure everything is running:
``systemctl status rabbitmq-server``


> Note: Perform all next steps in the virtualenv and in the rootfolder of the project

### Prepare the database
```
$python3 manage.py makemigrations
$python3 manage.py migrate
```

### Populate the database 
```
$python3 manage.py populateHierarchies
```

### Prepare static resources
```
$npm install
```

### Built React bundle
```
$./node_modules/.bin/webpack --config webpack.config.js --env.RELEASE_PATH=. --env.HOSTNAME=127.0.0.1
```

### Start Celery
```
$celery -A ramasceneMasterProject worker -l info  --concurrency 1 --queue calc_default
```

### Start the development server
```
$python3 manage.py runserver
```

Access the app via the webrowser: http://127.0.0.1:8000/ramascene/

# Core dependencies
---
The app uses Celery [4.1.0] (http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html), Django channels [2.1.3] (https://channels.readthedocs.io/en/latest/)

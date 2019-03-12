# config valid for current version and patch releases of Capistrano
lock '~> 3.11.0'

set :repo_url, 'https://bitbucket.org/CML-IE/rama-scene.git'

append :linked_dirs, 'log', 'datasets'

set :sas_systemd_use_sudo, true

# Using lazy loading trick, to have generic unit names, based on stage dependent application name
set :sas_systemd_celery_calculation, -> {"sas-celery-#{fetch(:application)}-calculation"}
set :sas_systemd_celery_modelling, -> {"sas-celery-#{fetch(:application)}-modelling"}
set :sas_systemd_flower, -> {"sas-flower-#{fetch(:application)}"}
set :sas_systemd_daphne, -> {"sas-daphne-#{fetch(:application)}"}

set :sas_webpack_roles, [:web]

set :yarn_roles, [:web]
# dropped --production flag, as we want to run webpack on the deployment server
set :yarn_flags, '--silent --no-progress'


set :application, 'ramascene_staging_celery_modelling'
server 'p4dev.sas.vito.local', user: 'jenkins', roles: [:job], systemd_units: [fetch(:sas_systemd_celery)]
set :keep_releases, 1
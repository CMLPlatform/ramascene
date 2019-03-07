set :application, 'ramascene_staging_celery'
server 'web02.ramascene.sas.vito.local', user: 'jenkins', roles: [:job], systemd_units: [fetch(:sas_systemd_celery), fetch(:sas_systemd_flower)]

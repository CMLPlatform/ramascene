set :application, 'ramascene_celery_calculation'
server 'web02.ramascene.sas.vito.local', user: 'jenkins', roles: [:job], systemd_units: [fetch(:sas_systemd_celery)]

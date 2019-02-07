set :application, 'ramascene_staging'
server 'p4dev.sas.vito.local', user: 'jenkins', roles: [:web], systemd_units: [fetch(:sas_systemd_daphne)]

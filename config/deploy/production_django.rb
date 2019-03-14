set :application, 'ramascene'
server 'web02.ramascene.sas.vito.local', user: 'jenkins', roles: [:web], systemd_units: [fetch(:sas_systemd_daphne)]

set :application, "ramascene"
server "dev01.app.sas.vito.local", user: "jenkins", roles: [:web, :job], systemd_units: [fetch(:systemd_gunicorn), fetch(:systemd_celery), fetch(:systemd_flower)]

set :hostname, "ramascene-staging.vito.local"

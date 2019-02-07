set :application, "ramascene"
server "web01.app.sas.vito.local", user: "jenkins", roles: [:web, :job], systemd_units: [fetch(:systemd_gunicorn), fetch(:systemd_celery), fetch(:systemd_flower)]

set :hostname, "ramascene.vito.be"

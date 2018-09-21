# config valid for current version and patch releases of Capistrano
lock "~> 3.11.0"

set :git_https_username, "bartdaniels"
set :git_https_password, "pass4Bitbucket"
set :repo_url, "https://bitbucket.org/CML-IE/rama-scene.git"

set :django_settings_dir, "ramasceneMasterProject"
set :pip_requirements, "requirements.txt"
set :wsgi_file, "ramasceneMasterProject.wsgi"
set :wsgi_path, "#{fetch(:django_settings_dir)}"
set :wsgi_file_name, "wsgi.py"

append :linked_dirs, 'log', 'datasets'

set :systemd_use_sudo, true
set :systemd_roles, %w(web)
set :systemd_unit, -> { "sas-daphne-#{fetch :application} celery-#{fetch :application}"}

set :flask, false
set :webpack, true

set :migration_role, :web
set :assets_roles, [:web]
set :yarn_roles, [:web] # In case you use the yarn package manager
set :yarn_flags, '--production=false --silent --no-progress'

after 'deploy:publishing', 'systemd:restart'

# Default branch is :master
# ask :branch, `git rev-parse --abbrev-ref HEAD`.chomp

# Default deploy_to directory is /var/www/my_app_name
# set :deploy_to, "/var/www/my_app_name"

# Default value for :format is :airbrussh.
# set :format, :airbrussh

# You can configure the Airbrussh format using :format_options.
# These are the defaults.
# set :format_options, command_output: true, log_file: "log/capistrano.log", color: :auto, truncate: :auto

# Default value for :pty is false
# set :pty, true

# Default value for :linked_files is []
# append :linked_files, "config/database.yml"

# Default value for linked_dirs is []
# append :linked_dirs, "log", "tmp/pids", "tmp/cache", "tmp/sockets", "public/system"

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for local_user is ENV['USER']
# set :local_user, -> { `git config user.name`.chomp }

# Default value for keep_releases is 5
# set :keep_releases, 5

# Uncomment the following to require manually verifying the host key before first deploy.
# set :ssh_options, verify_host_key: :secure

namespace :django do
  task :setup do
    if fetch(:django_compressor)
      invoke 'django:compress'
    end
    invoke 'django:compilemessages'
    invoke 'django:collectstatic'
    invoke 'django:symlink_settings'
    if !fetch(:nginx)
      invoke 'django:symlink_wsgi'
    end
    invoke 'django:makemigrations'
    invoke 'django:migrate'
    invoke 'django:populateHierarchies'
  end

  task :makemigrations do
    django("makemigrations", "--noinput", run_on=:web)
  end

  task :populateHierarchies do
    django("populateHierarchies", "", run_on=:web)
  end
end

before 'django:collectstatic', 'doc_root:setup'

namespace :doc_root do
  def doc_root(args, flags="", run_on=:all)
    on roles(run_on) do |h|
      execute "mkdir -p #{args}"
    end
  end

  task :setup do
    doc_root("public")
  end
end

before 'django:collectstatic', 'yarn:install'
after 'yarn:install', 'webpack:setup'

namespace :webpack do
  def webpack(args, flags="", run_on=:all)
    on roles(run_on) do |h|
      execute "#{release_path}/node_modules/.bin/webpack #{args}"
    end
  end

  task :setup do
    if fetch(:webpack)
      invoke 'webpack:run'
    end
  end

  task :run do
    webpack("--config #{release_path}/webpack.config.js --env.RELEASE_PATH=\"#{release_path}\" --env.HOSTNAME=\"#{fetch :hostname}\"")
  end
end
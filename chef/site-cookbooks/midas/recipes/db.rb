include_recipe 'postgresql'
include_recipe 'postgresql::server'
include_recipe 'postgresql::pg_user'
include_recipe 'postgresql::pg_database'
include_recipe 'postgresql::libpq'

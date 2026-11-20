-- Run this in Supabase SQL Editor to disable RLS
-- This allows the admin panel to read/write without authentication

alter table site_config   disable row level security;
alter table drops         disable row level security;
alter table wallet_config disable row level security;
alter table orders        disable row level security;

-- Also grant full access to anon role
grant all on site_config   to anon;
grant all on drops         to anon;
grant all on wallet_config to anon;
grant all on orders        to anon;

-- Grant storage access
grant all on storage.objects to anon;
grant all on storage.buckets to anon;

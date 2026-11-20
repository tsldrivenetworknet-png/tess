-- ============================================================
-- Drop Club — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── site_config ──────────────────────────────────────────────
-- Single-row table (enforced by check constraint on id = 1)
create table if not exists site_config (
  id                  integer primary key default 1 check (id = 1),
  site_name           text    not null default 'dropclub',
  logo_url            text    not null default '',
  icon_url            text    not null default '',
  announcement_text   text    not null default 'FRESH FINDS. REAL WINNERS. YOUR NEXT FAVOURITE STARTS HERE.',
  hero_headline       text    not null default 'A little luck.\nA lot of love.',
  hero_subtitle       text    not null default 'Your next favourite thing is one drop away.',
  hero_image_url      text    not null default '',
  hero_entries        text    not null default '2,184',
  hero_prize_value    text    not null default '$240',
  hero_delivery_fee   text    not null default '$8.50',
  footer_text         text    not null default '© 2026 Drop Club. Good things happen here.',
  updated_at          timestamptz not null default now()
);

-- Seed default row
insert into site_config (id) values (1) on conflict (id) do nothing;

-- ── drops ────────────────────────────────────────────────────
create table if not exists drops (
  id            uuid        primary key default uuid_generate_v4(),
  name          text        not null,
  category      text        not null default '',
  kind          text        not null check (kind in ('giveaway','shop')) default 'giveaway',
  image_url     text        not null default '',
  image_alt     text        not null default '',
  prize_value   text        not null default '',
  delivery_fee  text        not null default '',
  delivery_time text        not null default '',
  entry_label   text        not null default '',
  time_left     bigint      not null default 86400,
  amount        text        not null default '',   -- shop only, e.g. "$899"
  shipping      text        not null default '',   -- "Free" or "$8.50"
  description   text        not null default '',
  active        boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── wallet_config ─────────────────────────────────────────────
-- Single-row table
create table if not exists wallet_config (
  id                integer primary key default 1 check (id = 1),
  primary_address   text    not null default '',
  primary_coin      text    not null default 'ETH',
  secondary_address text    not null default '',
  secondary_coin    text    not null default 'BTC',
  accepted_coins    text[]  not null default array['ETH','BTC','USDC'],
  updated_at        timestamptz not null default now()
);

-- Seed default row
insert into wallet_config (id) values (1) on conflict (id) do nothing;

-- ── orders ───────────────────────────────────────────────────
create table if not exists orders (
  id            uuid        primary key default uuid_generate_v4(),
  drop_id       uuid        references drops(id) on delete set null,
  drop_name     text        not null,
  kind          text        not null check (kind in ('giveaway','shop')),
  email         text        not null,
  full_name     text        not null default '',
  address       text        not null default '',
  status        text        not null check (status in ('entered','paid','abandoned')) default 'entered',
  crypto        text        not null default '',
  amount        text        not null default '',
  delivery_fee  text        not null default '',
  notes         text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── updated_at triggers ───────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger drops_updated_at
  before update on drops
  for each row execute function set_updated_at();

create or replace trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

create or replace trigger site_config_updated_at
  before update on site_config
  for each row execute function set_updated_at();

create or replace trigger wallet_config_updated_at
  before update on wallet_config
  for each row execute function set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
-- Public can read site_config, drops, wallet_config (for the storefront)
-- Public can insert orders (to claim/checkout)
-- Only authenticated users (admin) can update/delete anything

alter table site_config   enable row level security;
alter table drops         enable row level security;
alter table wallet_config enable row level security;
alter table orders        enable row level security;

-- site_config: anyone reads, only auth updates
create policy "public read site_config"
  on site_config for select using (true);

create policy "auth update site_config"
  on site_config for update using (auth.role() = 'authenticated');

-- drops: anyone reads active drops, only auth manages
create policy "public read active drops"
  on drops for select using (active = true);

create policy "auth manage drops"
  on drops for all using (auth.role() = 'authenticated');

-- wallet_config: anyone reads, only auth updates
create policy "public read wallet_config"
  on wallet_config for select using (true);

create policy "auth update wallet_config"
  on wallet_config for update using (auth.role() = 'authenticated');

-- orders: anyone inserts (claiming), only auth reads/updates
create policy "public insert orders"
  on orders for insert with check (true);

create policy "auth manage orders"
  on orders for all using (auth.role() = 'authenticated');

-- ── Storage bucket ────────────────────────────────────────────
-- Create a public bucket called "dropclub" for all images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dropclub',
  'dropclub',
  true,
  10485760, -- 10 MB per file
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

-- Public can read all files in the bucket
create policy "public read dropclub storage"
  on storage.objects for select
  using (bucket_id = 'dropclub');

-- Authenticated users can upload/delete
create policy "auth upload dropclub storage"
  on storage.objects for insert
  with check (bucket_id = 'dropclub');

create policy "auth delete dropclub storage"
  on storage.objects for delete
  using (bucket_id = 'dropclub');

-- ── Seed: 3 default drops ─────────────────────────────────────
-- (image_url left blank — upload from admin panel)
insert into drops (name, category, kind, image_url, image_alt, prize_value, delivery_fee, delivery_time, entry_label, time_left, amount, shipping, description, sort_order)
values
  (
    'Scarlet High Tops',
    'STYLE · LIMITED EDITION',
    'giveaway',
    '',
    'White and scarlet high-top sneakers',
    '$240',
    '$8.50',
    'Ships in 2–4 days',
    '2,184 entered',
    389291,
    '',
    '$8.50',
    'Limited edition scarlet and white high-top sneakers.',
    1
  ),
  (
    'Studio Camera Kit',
    'TECH · CREATOR PICK',
    'shop',
    '',
    'Black mirrorless camera and lens',
    '$1,299 value',
    'Free',
    'Ships in 1–2 days',
    'Only 12 left',
    109350,
    '$899',
    'Free',
    'Professional mirrorless camera kit for creators.',
    2
  ),
  (
    'Evergreen Automatic',
    'OBJECTS · EDITION 04',
    'giveaway',
    '',
    'Stainless-steel watch with a deep green face',
    '$680',
    '$6.00',
    'Ships in 3–5 days',
    '816 entered',
    194944,
    '',
    '$6.00',
    'Stainless-steel automatic watch, edition 04.',
    3
  )
on conflict do nothing;

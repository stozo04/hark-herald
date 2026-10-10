-- Hark! the Herald: public, source-backed records. Browser visitors cannot modify anything.
-- Every table is prefixed hark_ because the project is shared. Never touch other tables.

create table if not exists public.hark_settings (
  id text primary key check (id = 'main'),
  content jsonb not null
);

-- One row per major feature Hark ships. Order of shipping decides which seal it fills.
create table if not exists public.hark_features (
  id text primary key check (id ~ '^f-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+$'),
  shipped_on date not null check (shipped_on >= date '2026-10-10'),
  title text not null check (length(title) between 1 and 80),
  summary text not null check (length(summary) between 1 and 400),
  category text not null default 'Feature',
  source_url text not null check (source_url ~ '^https://x[.]com/[A-Za-z0-9_]+/status/[0-9]+$'),
  product_url text check (product_url is null or product_url ~ '^https://'),
  unique (source_url, title)
);

-- Public user counts Brett or Hark have posted. Each needs its own post as a receipt.
create table if not exists public.hark_users (
  as_of date primary key,
  users integer not null check (users > 0),
  source_url text not null check (source_url ~ '^https://x[.]com/[A-Za-z0-9_]+/status/[0-9]+$')
);

alter table public.hark_settings enable row level security;
alter table public.hark_features enable row level security;
alter table public.hark_users enable row level security;
revoke all on public.hark_settings, public.hark_features, public.hark_users from anon, authenticated;
grant select on public.hark_settings, public.hark_features, public.hark_users to anon, authenticated;
grant select, insert, update, delete on public.hark_settings, public.hark_features, public.hark_users to service_role;
create policy "Public hark settings" on public.hark_settings for select to anon, authenticated using (true);
create policy "Public hark features" on public.hark_features for select to anon, authenticated using (true);
create policy "Public hark users" on public.hark_users for select to anon, authenticated using (true);

-- Starting settings for a fresh project. Safe to re-run; an existing row is left alone.
insert into public.hark_settings (id, content) values ('main', '{
  "title": "Hark! the Herald",
  "product": "Hark",
  "creator": "Brett Adcock",
  "handle": "adcock_brett",
  "promise": "12 major features over the next ~60 days",
  "promised": 12,
  "start_date": "2026-10-10",
  "end_date": "2026-12-08",
  "total_days": 60,
  "launch_date": "2026-10-06",
  "source_url": "https://x.com/adcock_brett",
  "verified_at": "2026-10-10"
}'::jsonb)
on conflict (id) do nothing;

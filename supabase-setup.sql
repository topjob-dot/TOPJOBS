-- =====================================================================
-- TOPJOBSEEKERS — run this ONCE in Supabase → SQL Editor. Safe to re-run.
-- =====================================================================

-- 1) Jobs: Kenya vs International + richer detail fields -----------------
alter table public.jobs add column if not exists region text default 'kenya';
alter table public.jobs add column if not exists requirements text;
alter table public.jobs add column if not exists responsibilities text;
alter table public.jobs add column if not exists benefits text;
alter table public.jobs add column if not exists source_url text;      -- original posting (auto-fetched jobs)
alter table public.jobs add column if not exists deadline date;
alter table public.jobs add column if not exists external_id text;
alter table public.jobs add column if not exists source text default 'manual';
alter table public.jobs add column if not exists updated_at timestamptz default now();

-- label existing rows sensibly
update public.jobs set region = 'kenya'
  where region is null and (country ilike '%kenya%' or location ilike '%kenya%' or location ilike '%nairobi%' or (country is null and location is null));
update public.jobs set region = 'international' where region is null;
create index if not exists jobs_region_idx on public.jobs(region, active, created_at desc);
create index if not exists jobs_external_id_idx on public.jobs(external_id);

-- 2) Scrap Jooble: switch off every job that came from it -----------------
update public.jobs set active = false where source = 'jooble';

-- 3) Applications remember which job they were for ------------------------
alter table public.cv_submissions add column if not exists job_id text;
alter table public.cv_submissions add column if not exists job_title text;

-- 4) Successful placements (cards with photos) ----------------------------
create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  country text,
  country_flag text,
  employer text,
  quote text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.placements enable row level security;

drop policy if exists "placements public read" on public.placements;
create policy "placements public read" on public.placements for select using (active = true);

drop policy if exists "placements admin all" on public.placements;
create policy "placements admin all" on public.placements for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- photo bucket (public read, admin upload)
insert into storage.buckets (id, name, public) values ('placement-photos', 'placement-photos', true)
  on conflict (id) do nothing;

drop policy if exists "placement photos read" on storage.objects;
create policy "placement photos read" on storage.objects for select using (bucket_id = 'placement-photos');

drop policy if exists "placement photos admin write" on storage.objects;
create policy "placement photos admin write" on storage.objects for all
  using (bucket_id = 'placement-photos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (bucket_id = 'placement-photos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 5) OPTIONAL: auto-fetch Kenyan jobs every 6 hours -----------------------
-- Enable the "pg_cron" and "pg_net" extensions (Database → Extensions), then uncomment:
-- select cron.schedule('sync-kenya-jobs', '0 */6 * * *', $$
--   select net.http_post(
--     url := 'https://oqptvdxnooyhkfszddsc.supabase.co/functions/v1/sync-external-jobs',
--     headers := '{"Content-Type":"application/json","x-sync-secret":"PUT-YOUR-SYNC_SECRET-HERE"}'::jsonb,
--     body := '{}'::jsonb);
-- $$);

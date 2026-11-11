-- =====================================================================
-- TOPJOBSEEKERS portal upgrade: run ONCE in Supabase > SQL Editor. Safe to re-run.
-- =====================================================================
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- 1) Profile questions ------------------------------------------------
alter table public.profiles add column if not exists residence text;
alter table public.profiles add column if not exists current_work text;
alter table public.profiles add column if not exists preferred_location text;
alter table public.profiles add column if not exists job_alerts boolean default true;

-- clients can change ONLY these four fields (never their role or wallet)
create or replace function public.update_my_profile(p_residence text, p_current_work text, p_preferred_location text, p_job_alerts boolean)
returns void language sql security definer set search_path = public as $$
  update public.profiles set residence = nullif(trim(p_residence), ''), current_work = nullif(trim(p_current_work), ''),
    preferred_location = nullif(trim(p_preferred_location), ''), job_alerts = coalesce(p_job_alerts, true)
  where id = auth.uid(); $$;
grant execute on function public.update_my_profile(text, text, text, boolean) to authenticated;

-- 2) Applications (history). Filled automatically from every CV submission ----
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id text unique, job_id text, job_title text,
  status text not null default 'new', created_at timestamptz not null default now());
alter table public.applications enable row level security;
drop policy if exists "applications own read" on public.applications;
create policy "applications own read" on public.applications for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.on_cv_submission() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    insert into public.applications (user_id, submission_id, job_id, job_title, status)
      values (new.user_id, new.id::text, new.job_id, new.job_title, coalesce(new.status, 'new')) on conflict do nothing;
    insert into public.notifications (user_id, type, title, body, link)
      values (new.user_id, 'application', 'Application sent', coalesce(new.job_title, 'General CV submission'), 'dashboard.html');
  end if;
  return new;
exception when others then return new; end $$;
drop trigger if exists trg_cv_submission on public.cv_submissions;
create trigger trg_cv_submission after insert on public.cv_submissions for each row execute function public.on_cv_submission();

create or replace function public.on_cv_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.applications set status = new.status where submission_id = new.id::text;
  if new.user_id is not null and new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, link)
      values (new.user_id, 'application', 'Application update: ' || new.status, coalesce(new.job_title, 'Your CV'), 'dashboard.html');
  end if;
  return new;
exception when others then return new; end $$;
drop trigger if exists trg_cv_status on public.cv_submissions;
create trigger trg_cv_status after update of status on public.cv_submissions for each row execute function public.on_cv_status();

-- 3) Notifications (bell) ---------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, body text, link text,
  read boolean not null default false, created_at timestamptz not null default now());
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications own mark read" on public.notifications;
create policy "notifications own mark read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Job alerts: new job -> matching profiles get a notification (email goes out via the send-job-alert webhook)
create or replace function public.notify_job_match() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.active is not true then return new; end if;
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'job_match', 'New job for you: ' || new.title, coalesce(new.company, '') || ' ' || coalesce(new.location, new.country, ''), 'index.html#jobsList'
  from public.profiles p
  where p.role = 'job_seeker' and coalesce(p.job_alerts, true)
    and ( (nullif(trim(p.preferred_location), '') is not null and (coalesce(new.location, '') || ' ' || coalesce(new.country, '')) ilike '%' || trim(p.preferred_location) || '%')
       or (nullif(trim(p.current_work), '') is not null and (coalesce(new.title, '') || ' ' || coalesce(new.category, '')) ilike '%' || trim(p.current_work) || '%') );
  return new;
exception when others then return new; end $$;
drop trigger if exists trg_job_match on public.jobs;
create trigger trg_job_match after insert on public.jobs for each row execute function public.notify_job_match();

-- 5) Payments: clients can READ their own rows. Nobody but the webhook (service role) can write.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  api_ref text not null unique, invoice_id text, provider text not null default 'intasend',
  method text, amount numeric(12,2) not null check (amount > 0), currency text not null default 'KES',
  phone text, purpose text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  failed_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.payments enable row level security;
drop policy if exists "payments own read" on public.payments;
create policy "payments own read" on public.payments for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.payments from anon, authenticated;

-- 6) Payouts: logged by you, approved by you (admin only)
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  recipient text not null, phone text, amount numeric(12,2) not null check (amount > 0), reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  logged_by uuid references auth.users(id) default auth.uid(), approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(), approved_at timestamptz);
alter table public.payouts enable row level security;
drop policy if exists "payouts admin all" on public.payouts;
create policy "payouts admin all" on public.payouts for all using (public.is_admin()) with check (public.is_admin());

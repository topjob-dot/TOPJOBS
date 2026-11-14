-- =====================================================================
-- TOPJOBSEEKERS: M-Pesa withdrawals. Run ONCE in Supabase > SQL Editor. Safe to re-run.
-- Needs the existing profiles.wallet_balance + wallet_transactions(user_id, amount, reason, created_by).
-- Flow: client requests -> money is held (deducted) right away -> admin Approves, sends the M-Pesa, then Marks paid.
--       If admin Rejects, the held money is returned to the client's balance automatically.
-- =====================================================================
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  decided_by uuid references auth.users(id), decided_at timestamptz,
  created_at timestamptz not null default now());
create index if not exists withdrawals_user_idx on public.withdrawals(user_id, created_at desc);
alter table public.withdrawals enable row level security;
drop policy if exists "withdrawals own read" on public.withdrawals;
create policy "withdrawals own read" on public.withdrawals for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.withdrawals from anon, authenticated;   -- only the two functions below can write

-- Client asks to withdraw. Checks balance, limits and phone number, then holds the money.
create or replace function public.request_withdrawal(p_amount numeric, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s\-()]', '', 'g');
  v_id uuid;
  v_min constant numeric := 100;        -- smallest withdrawal (KES). Keep in step with minWithdrawal in site-config.js
  v_max constant numeric := 150000;     -- M-Pesa single-transaction ceiling
begin
  if v_uid is null then raise exception 'Please log in first.'; end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'job_seeker') then
    raise exception 'Only client accounts can withdraw.'; end if;

  -- accept 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX -> store as 2547XXXXXXXX
  v_phone := regexp_replace(v_phone, '^\+', '');
  if v_phone ~ '^0[17]\d{8}$' then v_phone := '254' || substr(v_phone, 2); end if;
  if v_phone !~ '^254[17]\d{8}$' then raise exception 'Enter a valid Safaricom M-Pesa number, e.g. 0712 345 678.'; end if;

  if p_amount is null or p_amount < v_min then raise exception 'The minimum withdrawal is KES %.', v_min; end if;
  if p_amount > v_max then raise exception 'The maximum per withdrawal is KES %.', v_max; end if;
  if p_amount <> trunc(p_amount) then raise exception 'Please enter a whole amount.'; end if;

  -- lock the row so two quick taps cannot spend the same money twice
  select wallet_balance into v_balance from profiles where id = v_uid for update;
  if coalesce(v_balance, 0) < p_amount then raise exception 'You do not have enough balance for that amount.'; end if;

  insert into withdrawals (user_id, amount, phone) values (v_uid, p_amount, v_phone) returning id into v_id;
  insert into wallet_transactions (user_id, amount, reason, created_by)
    values (v_uid, -p_amount, 'M-Pesa withdrawal request', v_uid);
  insert into notifications (user_id, type, title, body, link)
    values (v_uid, 'payment', 'Withdrawal requested', 'KES ' || p_amount || ' to ' || v_phone || ' is awaiting approval.', 'dashboard.html');
  return v_id;
end $$;
grant execute on function public.request_withdrawal(numeric, text) to authenticated;

-- Admin moves a request: pending -> approved | rejected, approved -> paid.
create or replace function public.decide_withdrawal(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare w withdrawals;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('approved', 'rejected', 'paid') then raise exception 'Unknown status.'; end if;
  select * into w from withdrawals where id = p_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if not ((w.status = 'pending' and p_status in ('approved', 'rejected')) or (w.status = 'approved' and p_status = 'paid')) then
    raise exception 'A % request cannot be changed to %.', w.status, p_status; end if;

  update withdrawals set status = p_status, decided_by = auth.uid(), decided_at = now() where id = p_id;

  if p_status = 'rejected' then   -- give the held money back
    insert into wallet_transactions (user_id, amount, reason, created_by)
      values (w.user_id, w.amount, 'Withdrawal rejected: refund', auth.uid());
  end if;
  insert into notifications (user_id, type, title, body, link)
    values (w.user_id, 'payment',
      case p_status when 'approved' then 'Withdrawal approved' when 'paid' then 'Withdrawal sent to M-Pesa' else 'Withdrawal rejected' end,
      'KES ' || w.amount || case p_status when 'rejected' then ' has been returned to your balance.' when 'paid' then ' was sent to ' || w.phone || '.' else ' is being sent to ' || w.phone || '.' end,
      'dashboard.html');
end $$;
grant execute on function public.decide_withdrawal(uuid, text) to authenticated;

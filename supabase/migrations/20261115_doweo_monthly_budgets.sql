-- Financial planning complements existing personal transactions and shared goal tables.
-- Tracking only: no funds are held, moved, or automatically settled.
create table if not exists public.doweo_monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  category text not null check (char_length(category) between 1 and 50),
  limit_amount numeric(14,2) not null check (limit_amount > 0 and limit_amount <= 99999999),
  currency text not null default 'USD' check (currency = 'USD'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,month,category),
  check (extract(day from month) = 1)
);
create index if not exists doweo_monthly_budgets_user_month on public.doweo_monthly_budgets (user_id,month);
alter table public.doweo_monthly_budgets enable row level security;
revoke all on public.doweo_monthly_budgets from public, anon, authenticated;
grant select,insert,update,delete on public.doweo_monthly_budgets to service_role;
comment on table public.doweo_monthly_budgets is 'Account-private category budgets, managed by the authenticated DoWeo API. No payment handling.';

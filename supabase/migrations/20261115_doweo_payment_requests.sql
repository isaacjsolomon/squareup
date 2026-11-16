-- Noncustodial payment request links. They never confirm or transfer payments.
create table if not exists public.doweo_payment_requests (
 id uuid primary key default gen_random_uuid(),
 token uuid not null unique default gen_random_uuid(),
 created_by uuid not null references auth.users(id) on delete cascade,
 tracker_id uuid not null references public.trackers(id) on delete cascade,
 amount numeric(14,2) not null check (amount > 0 and amount <= 99999999),
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 public_note text not null default '' check (char_length(public_note) <= 120),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '7 days'),
 revoked_at timestamptz,
 check (expires_at > created_at)
);
create index if not exists doweo_payment_requests_owner on public.doweo_payment_requests (created_by,created_at desc);
create index if not exists doweo_payment_requests_tracker on public.doweo_payment_requests (tracker_id);
alter table public.doweo_payment_requests enable row level security;
revoke all on public.doweo_payment_requests from public, anon, authenticated;
grant select, insert, update, delete on public.doweo_payment_requests to service_role;
comment on table public.doweo_payment_requests is 'Short-lived shareable requests for payment discussion only. No custodial or settlement functionality.';

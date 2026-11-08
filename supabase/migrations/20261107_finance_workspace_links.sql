-- Account-synced Finance Hub workspace links.
-- Linking an existing tracker does not create or alter transactions, balances, or membership.
create table if not exists public.squareup_finance_workspace_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  workspace_type text not null check (workspace_type in ('trip','household')),
  created_at timestamptz not null default now(),
  primary key (user_id, tracker_id, workspace_type)
);
create index if not exists sq_finance_workspace_links_type on public.squareup_finance_workspace_links (user_id, workspace_type);
alter table public.squareup_finance_workspace_links enable row level security;
revoke all on public.squareup_finance_workspace_links from anon, authenticated;
grant select, insert, delete on public.squareup_finance_workspace_links to service_role;
comment on table public.squareup_finance_workspace_links is
  'Per-user links from existing accessible trackers to Finance Hub Trip/Household directories. Accessed only by authorized server-side API.';

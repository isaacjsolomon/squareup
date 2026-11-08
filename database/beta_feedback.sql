-- DoWeo Beta Feedback Center
-- REVIEW AND APPLY IN SUPABASE SQL EDITOR BEFORE DEPLOYING THE FEATURE.
-- Does not delete or alter existing application tables. No personal finance data is imported.
-- The Cloudflare /api/feedback endpoint is the *only* client access path.
create table if not exists public.doweo_beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bug','idea','rating')),
  title text not null default '' check (char_length(title) <= 120),
  details text not null default '' check (char_length(details) <= 2000),
  steps text not null default '' check (char_length(steps) <= 900),
  rating smallint check (rating between 1 and 5),
  device text not null default 'other' check (device in ('desktop','mobile','tablet','other')),
  page text not null default '/' check (char_length(page) <= 120),
  status text not null default 'new' check (status in ('new','reviewing','planned','resolved','closed')),
  created_at timestamptz not null default now(),
  constraint doweo_beta_feedback_kind_fields check (
    (kind = 'rating' and rating is not null and title = '' and steps = '')
    or
    (kind in ('bug','idea') and rating is null
      and char_length(btrim(title)) between 5 and 120
      and char_length(btrim(details)) between 15 and 2000)
  )
);

create index if not exists doweo_beta_feedback_user_created_idx
  on public.doweo_beta_feedback (user_id, created_at desc);
create index if not exists doweo_beta_feedback_kind_created_idx
  on public.doweo_beta_feedback (kind, created_at desc);

-- Deny PostgREST browser roles. The server checks Supabase JWTs and filters by
-- user_id before using the service-role key; service_role bypasses RLS.
alter table public.doweo_beta_feedback enable row level security;
revoke all on table public.doweo_beta_feedback from public, anon, authenticated;
grant select, insert, update, delete on table public.doweo_beta_feedback to service_role;

comment on table public.doweo_beta_feedback is
  'Private beta feedback. No direct client reads or writes; mediated by authenticated Pages Function.';

-- Optional verification after applying:
-- select relrowsecurity from pg_class where oid = 'public.doweo_beta_feedback'::regclass;
-- select grantee, privilege_type from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'doweo_beta_feedback';

-- Apply this migration to the intended DoWeo Supabase project BEFORE merging the frontend/API PR.
-- Feedback is writable only through the authenticated Cloudflare API; clients have no direct table grants.
create table if not exists public.doweo_beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','idea','rating')),
  title text not null check (char_length(title) between 3 and 120),
  details text not null check (char_length(details) between 3 and 2000),
  rating smallint check (rating between 1 and 5),
  page_path text not null default '/',
  device_info text not null default '',
  status text not null default 'new' check (status in ('new','reviewing','planned','resolved','closed')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  email_provider_id text,
  email_error text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rating_required check ((category = 'rating' and rating is not null) or (category <> 'rating' and rating is null))
);
create index if not exists doweo_beta_feedback_user_recent on public.doweo_beta_feedback (user_id, created_at desc);
create index if not exists doweo_beta_feedback_email_pending on public.doweo_beta_feedback (email_status, created_at) where email_status <> 'sent';
create index if not exists doweo_beta_feedback_review on public.doweo_beta_feedback (status, created_at desc);
alter table public.doweo_beta_feedback enable row level security;
revoke all on public.doweo_beta_feedback from anon, authenticated;
grant select, insert, update on public.doweo_beta_feedback to service_role;
-- No direct RLS policies: the service-role API validates the JWT and user ID on every request.
comment on table public.doweo_beta_feedback is 'Private beta feedback submitted via authenticated DoWeo API; do not expose directly to browsers.';

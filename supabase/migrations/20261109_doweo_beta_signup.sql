-- DoWeo public beta application intake. No access to existing finance records.
create table if not exists public.doweo_beta_applications (
 id uuid primary key default gen_random_uuid(),
 display_name text not null check (char_length(display_name) between 2 and 80),
 email text not null,
 device text not null check (device in ('iphone','android','desktop','multiple')),
 use_case text not null check (use_case in ('friends','trips','households','personal','other')),
 note text not null default '' check (char_length(note) <= 600),
 status text not null default 'pending' check (status in ('pending','approved','rejected','waitlisted')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists doweo_beta_applications_email_unique on public.doweo_beta_applications (lower(email));
create index if not exists doweo_beta_applications_review_idx on public.doweo_beta_applications(status,created_at desc);
alter table public.doweo_beta_applications enable row level security;
revoke all on public.doweo_beta_applications from public,anon,authenticated;
grant select,insert,update on public.doweo_beta_applications to service_role;
comment on table public.doweo_beta_applications is 'Private beta applications. Access restricted to server using service role and project admins.';
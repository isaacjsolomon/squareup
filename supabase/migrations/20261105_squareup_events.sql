-- SquareUp Events: additive migration. Review against existing tracker schema before running.
create extension if not exists pgcrypto;
create table if not exists public.sq_events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 tracker_id text not null unique,
 title text not null check(char_length(title) between 1 and 100),
 description text not null default '',
 kind text not null default 'other',
 status text not null default 'planning',
 starts_at timestamptz not null,
 ends_at timestamptz,
 timezone text not null default 'America/New_York',
 location text not null default '',
 budget_minor bigint check(budget_minor >= 0),
 currency text not null default 'USD',
 cover_path text,
 created_at timestamptz not null default now(),
 check(ends_at is null or ends_at >= starts_at)
);
create table if not exists public.sq_event_members (
 event_id uuid not null references public.sq_events(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 role text not null default 'guest' check(role in ('host','cohost','guest')),
 rsvp text not null default 'pending' check(rsvp in ('pending','going','maybe','declined','waitlisted')),
 invited_at timestamptz not null default now(),
 responded_at timestamptz,
 primary key(event_id,user_id)
);
create table if not exists public.sq_event_activities (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.sq_events(id) on delete cascade,
 title text not null,
 description text not null default '',
 starts_at timestamptz,
 ends_at timestamptz,
 location text not null default '',
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.sq_event_polls (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.sq_events(id) on delete cascade,
 question text not null,
 options jsonb not null default '[]'::jsonb,
 closes_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.sq_event_votes (
 poll_id uuid not null references public.sq_event_polls(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 option_index integer not null check(option_index >= 0),
 primary key(poll_id,user_id)
);
create table if not exists public.sq_event_messages (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.sq_events(id) on delete cascade,
 sender_id uuid not null references auth.users(id),
 content text not null check(char_length(content) between 1 and 5000),
 created_at timestamptz not null default now()
);
create index if not exists sq_event_members_user_idx on public.sq_event_members(user_id);
create index if not exists sq_event_activities_event_idx on public.sq_event_activities(event_id,starts_at);
create index if not exists sq_event_messages_event_idx on public.sq_event_messages(event_id,created_at);
create or replace function public.sq_event_is_member(eid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sq_event_members m where m.event_id=eid and m.user_id=(select auth.uid()) and m.rsvp <> 'declined')
$$;
create or replace function public.sq_event_is_manager(eid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sq_event_members m where m.event_id=eid and m.user_id=(select auth.uid()) and m.role in ('host','cohost'))
$$;
alter table public.sq_events enable row level security;
alter table public.sq_event_members enable row level security;
alter table public.sq_event_activities enable row level security;
alter table public.sq_event_polls enable row level security;
alter table public.sq_event_votes enable row level security;
alter table public.sq_event_messages enable row level security;
create policy "events read" on public.sq_events for select to authenticated using(owner_id=(select auth.uid()) or public.sq_event_is_member(id));
create policy "events insert" on public.sq_events for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "events update" on public.sq_events for update to authenticated using(public.sq_event_is_manager(id));
create policy "members read" on public.sq_event_members for select to authenticated using(public.sq_event_is_member(event_id) or user_id=(select auth.uid()));
create policy "members manage" on public.sq_event_members for insert to authenticated with check(public.sq_event_is_manager(event_id) or (user_id=(select auth.uid()) and role='host' and exists(select 1 from public.sq_events e where e.id=event_id and e.owner_id=(select auth.uid()))));
create policy "members update" on public.sq_event_members for update to authenticated using(public.sq_event_is_manager(event_id) or user_id=(select auth.uid())) with check(public.sq_event_is_manager(event_id) or user_id=(select auth.uid()));
create policy "activities read" on public.sq_event_activities for select to authenticated using(public.sq_event_is_member(event_id));
create policy "activities insert" on public.sq_event_activities for insert to authenticated with check(public.sq_event_is_manager(event_id));
create policy "activities update" on public.sq_event_activities for update to authenticated using(public.sq_event_is_manager(event_id));
create policy "activities delete" on public.sq_event_activities for delete to authenticated using(public.sq_event_is_manager(event_id));
create policy "polls read" on public.sq_event_polls for select to authenticated using(public.sq_event_is_member(event_id));
create policy "polls insert" on public.sq_event_polls for insert to authenticated with check(public.sq_event_is_manager(event_id));
create policy "votes read" on public.sq_event_votes for select to authenticated using(exists(select 1 from public.sq_event_polls p where p.id=poll_id and public.sq_event_is_member(p.event_id)));
create policy "votes insert" on public.sq_event_votes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.sq_event_polls p where p.id=poll_id and public.sq_event_is_member(p.event_id)));
create policy "votes update" on public.sq_event_votes for update to authenticated using(user_id=(select auth.uid()));
create policy "messages read" on public.sq_event_messages for select to authenticated using(public.sq_event_is_member(event_id));
create policy "messages insert" on public.sq_event_messages for insert to authenticated with check(sender_id=(select auth.uid()) and public.sq_event_is_member(event_id));
-- IMPORTANT: before production, implement atomic tracker provisioning and tighten member RSVP update policy so guests cannot edit role.

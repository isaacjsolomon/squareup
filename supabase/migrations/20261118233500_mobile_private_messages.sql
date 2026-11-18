create table public.dw_private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp(),
  check (sender_id <> recipient_id)
);
create index dw_dm_outgoing on public.dw_private_messages(sender_id,recipient_id,created_at desc);
create index dw_dm_incoming on public.dw_private_messages(recipient_id,sender_id,created_at desc);
alter table public.dw_private_messages enable row level security;
revoke all on public.dw_private_messages from public, anon, authenticated;
grant select, insert(recipient_id,body) on public.dw_private_messages to authenticated;

create function public.dw_dm_contacts() returns table(peer uuid)
language sql stable security definer set search_path='' as $$
  with membership as (
    select tracker_id,user_id from public.tracker_members
    union select id,owner_id from public.trackers
  ), eligible as (
    select case when user_low=auth.uid() then user_high else user_low end::text as uid
    from public.sq_friendships where status='accepted' and auth.uid() in (user_low,user_high)
    union
    select other.user_id from membership mine join membership other using(tracker_id)
    where mine.user_id=auth.uid()::text
  )
  select u.id from eligible e join auth.users u on u.id::text=e.uid where u.id<>auth.uid()
$$;
create policy dm_participants_read on public.dw_private_messages for select to authenticated
using (auth.uid() in (sender_id,recipient_id));
create policy dm_eligible_send on public.dw_private_messages for insert to authenticated
with check(sender_id=auth.uid() and recipient_id in (select peer from public.dw_dm_contacts()));

create function public.dw_dm_directory()
returns table(peer uuid,name text,username text,eligible boolean, preview text,last_at timestamptz,incoming boolean)
language sql stable security definer set search_path='' as $$
  with eligible as (select peer from public.dw_dm_contacts()), latest as (
    select distinct on (other) other,body,created_at,sender_id from (
      select case when sender_id=auth.uid() then recipient_id else sender_id end other,m.*
      from public.dw_private_messages m where auth.uid() in (sender_id,recipient_id)
    ) a order by other,created_at desc,id desc
  )
  select coalesce(e.peer,l.other), coalesce(nullif(p.display_name,''),nullif(p.username,''),m.name,'DoWeo member'),
    p.username,e.peer is not null,l.body,l.created_at,l.sender_id<>auth.uid()
  from eligible e full join latest l on l.other=e.peer
  left join public.profiles p on p.user_id=coalesce(e.peer,l.other)::text
  left join lateral (select tm.name from public.tracker_members tm where tm.user_id=coalesce(e.peer,l.other)::text and tm.name<>'' and exists
    (select 1 from public.trackers t where t.id=tm.tracker_id and (t.owner_id=auth.uid()::text or exists (select 1 from public.tracker_members x where x.tracker_id=t.id and x.user_id=auth.uid()::text))) limit 1) m on true
$$;
revoke all on function public.dw_dm_contacts(),public.dw_dm_directory() from public,anon;
grant execute on function public.dw_dm_contacts(),public.dw_dm_directory() to authenticated;
create function public.dw_dm_directory_layout()
returns table(peer uuid,name text,username text,eligible boolean,preview text,last_at timestamptz,incoming boolean,is_friend boolean,shared_names text[],photo text)
language sql stable security definer set search_path='' as $$
 with memberships as (
   select tracker_id,user_id from public.tracker_members
   union select id,owner_id from public.trackers
 ), shared as (
   select other.user_id,array_agg(t.name order by t.name,t.id) as names
   from memberships mine join memberships other using(tracker_id)
   join public.trackers t on t.id=mine.tracker_id
   where mine.user_id=auth.uid()::text group by other.user_id
 )
 select d.*,exists(select 1 from public.sq_friendships f where f.status='accepted' and
 f.user_low=least(auth.uid(),d.peer) and f.user_high=greatest(auth.uid(),d.peer)),
 coalesce(s.names,array[]::text[]),p.photo_key
 from public.dw_dm_directory() d left join shared s on s.user_id=d.peer::text
 left join public.profiles p on p.user_id=d.peer::text
$$;
revoke all on function public.dw_dm_directory_layout() from public,anon;
grant execute on function public.dw_dm_directory_layout() to authenticated;
alter table public.squareup_polls add column if not exists ends_at timestamptz;
alter table public.squareup_polls add column if not exists archived_at timestamptz;
create or replace function public.doweo_manage_poll(p_tracker_id uuid,p_poll_id uuid,p_actor_id uuid,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.squareup_polls%rowtype; t public.trackers%rowtype; is_owner boolean; vote_count integer; deadline timestamptz; opt jsonb; pos integer:=0; opt_id uuid;
begin
 select * into t from public.trackers where id=p_tracker_id;
 if not found then return jsonb_build_object('error','Tracker not found.','status',404); end if;
 is_owner:=coalesce(lower(t.owner_id)=lower(p_actor_id::text),false) or (t.owner_id is null and exists(select 1 from public.tracker_members where tracker_id=p_tracker_id and lower(user_id)=lower(p_actor_id::text) and role='owner'));
 if not is_owner and not exists(select 1 from public.tracker_members where tracker_id=p_tracker_id and lower(user_id)=lower(p_actor_id::text)) then
  return jsonb_build_object('error','Tracker not found.','status',404);
 end if;
 select * into p from public.squareup_polls where id=p_poll_id and tracker_id=p_tracker_id for update;
 if not found then return jsonb_build_object('error','Poll not found.','status',404); end if;
 if p_action='vote' then
  if p.archived_at is not null or p.closed or (p.ends_at is not null and p.ends_at<=clock_timestamp()) then
   return jsonb_build_object('error','This poll is closed.','status',409);
  end if;
  select id into opt_id from public.squareup_poll_options where poll_id=p.id and id::text=p_payload->>'optionId';
  if opt_id is null then return jsonb_build_object('error','Invalid poll option.','status',400); end if;
  insert into public.squareup_poll_votes(poll_id,user_id,option_id) values(p.id,p_actor_id,opt_id)
   on conflict(poll_id,user_id) do update set option_id=excluded.option_id;
  return jsonb_build_object('success',true);
 end if;
 if not is_owner and p.created_by<>p_actor_id then return jsonb_build_object('error','Only the creator or tracker owner can manage this poll.','status',403); end if;
 if p_action='close' then update public.squareup_polls set closed=true where id=p.id;
 elsif p_action='reopen' then
  if p.archived_at is not null then return jsonb_build_object('error','Restore this poll first.','status',409); end if;
  update public.squareup_polls set closed=false,ends_at=case when ends_at<=clock_timestamp() then null else ends_at end where id=p.id;
 elsif p_action='archive' then update public.squareup_polls set archived_at=clock_timestamp() where id=p.id;
 elsif p_action='restore' then update public.squareup_polls set archived_at=null where id=p.id;
 elsif p_action='edit' then
  select count(*) into vote_count from public.squareup_poll_votes where poll_id=p.id;
  if vote_count>0 then return jsonb_build_object('error','This poll already has votes. Duplicate it to make changes.','status',409); end if;
  if p.closed or p.archived_at is not null or (p.ends_at is not null and p.ends_at<=clock_timestamp()) then return jsonb_build_object('error','Only open polls can be edited.','status',409); end if;
  if length(trim(coalesce(p_payload->>'question','')))=0 or length(p_payload->>'question')>160 or jsonb_typeof(p_payload->'options') is distinct from 'array' then
   return jsonb_build_object('error','Enter a question and 2–4 options.','status',400);
  end if;
  if jsonb_array_length(p_payload->'options') not between 2 and 4 then return jsonb_build_object('error','Enter 2–4 options.','status',400); end if;
  for opt in select value from jsonb_array_elements(p_payload->'options') loop
   if jsonb_typeof(opt)<>'string' or length(trim(opt#>>'{}')) not between 1 and 100 then return jsonb_build_object('error','Options must contain 1–100 characters.','status',400); end if;
  end loop;
  begin deadline:=nullif(p_payload->>'endsAt','')::timestamptz;
  exception when others then return jsonb_build_object('error','Invalid deadline.','status',400); end;
  if deadline is not null and deadline<=clock_timestamp() then return jsonb_build_object('error','Choose a future deadline.','status',400); end if;
  update public.squareup_polls set question=trim(p_payload->>'question'),ends_at=deadline where id=p.id;
  delete from public.squareup_poll_options where poll_id=p.id;
  for opt in select value from jsonb_array_elements(p_payload->'options') loop
   insert into public.squareup_poll_options(poll_id,label,position) values(p.id,trim(opt#>>'{}'),pos);pos:=pos+1;
  end loop;
 else return jsonb_build_object('error','Invalid poll action.','status',400);
 end if;
 return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.doweo_manage_poll(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.doweo_manage_poll(uuid,uuid,uuid,text,jsonb) to service_role;
notify pgrst,'reload schema';

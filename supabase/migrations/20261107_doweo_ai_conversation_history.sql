-- Account-linked text-only Weo chat history; image content is never persisted.
create table if not exists public.doweo_ai_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'New conversation',
 messages jsonb not null default '[]'::jsonb check(jsonb_typeof(messages)='array'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists doweo_ai_conversations_owner_recent on public.doweo_ai_conversations (user_id,updated_at desc);
alter table public.doweo_ai_conversations enable row level security;
revoke all on public.doweo_ai_conversations from public,anon,authenticated;
grant select,insert,update,delete on public.doweo_ai_conversations to service_role;
comment on table public.doweo_ai_conversations is 'Private account-linked Weo chat history, accessed only by authenticated server endpoints.';
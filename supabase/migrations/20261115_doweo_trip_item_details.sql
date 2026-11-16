-- Add detail fields to existing trip itinerary items without changing their IDs or financial records.
alter table public.squareup_trip_items
  add column if not exists notes text not null default '',
  add column if not exists estimated_cost numeric(14,2),
  add column if not exists link_url text;
comment on column public.squareup_trip_items.estimated_cost is 'Planning estimate only: never counted as a tracker debt or payment.';

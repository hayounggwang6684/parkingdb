create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null,
  normalized_plate_number text generated always as (
    upper(regexp_replace(plate_number, '[^0-9A-Za-z가-힣]', '', 'g'))
  ) stored,
  car_model text not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_plate_number_not_blank check (length(trim(plate_number)) > 0),
  constraint vehicles_car_model_not_blank check (length(trim(car_model)) > 0),
  constraint vehicles_normalized_plate_number_unique unique (normalized_plate_number)
);

create index if not exists vehicles_created_at_idx on public.vehicles (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vehicles_updated_at on public.vehicles;

create trigger set_vehicles_updated_at
before update on public.vehicles
for each row
execute function public.set_updated_at();

alter table public.vehicles enable row level security;

create policy "Allow vehicle reads"
on public.vehicles
for select
using (true);

create policy "Allow vehicle inserts"
on public.vehicles
for insert
with check (true);

create policy "Allow vehicle updates"
on public.vehicles
for update
using (true)
with check (true);

create policy "Allow vehicle deletes"
on public.vehicles
for delete
using (true);

alter table public.vehicles
add column if not exists vehicle_type text,
add column if not exists mechanical_parking text,
add column if not exists mechanical_note text;

create index if not exists vehicles_vehicle_type_idx on public.vehicles (vehicle_type);
create index if not exists vehicles_mechanical_parking_idx on public.vehicles (mechanical_parking);

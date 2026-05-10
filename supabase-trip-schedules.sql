create table if not exists public.bus_trip_schedules (
  id uuid primary key default gen_random_uuid(),
  route_key text not null unique check (
    route_key in ('cebu-to-pinamungajan', 'pinamungajan-to-cebu')
  ),
  label text not null,
  monday text[] not null default '{}',
  other text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.bus_trip_schedules enable row level security;

drop policy if exists "Anyone can read trip schedules" on public.bus_trip_schedules;
create policy "Anyone can read trip schedules"
on public.bus_trip_schedules
for select
using (true);

drop policy if exists "Admins can manage trip schedules" on public.bus_trip_schedules;
create policy "Admins can manage trip schedules"
on public.bus_trip_schedules
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

insert into public.bus_trip_schedules (route_key, label, monday, other)
values
  (
    'cebu-to-pinamungajan',
    'CEBU TO PINAMUNGAHAN',
    array[
      '7:25 AM', '7:45 AM', '8:05 AM', '8:25 AM', '8:45 AM', '9:05 AM',
      '2:45 PM', '3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM'
    ],
    array[
      '7:45 AM', '8:30 AM', '9:15 AM', '10:00 AM', '10:45 AM', '11:30 AM',
      '2:45 PM', '3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM'
    ]
  ),
  (
    'pinamungajan-to-cebu',
    'PINAMUNGAHAN TO CEBU',
    array[
      '3:40 AM', '4:00 AM', '4:20 AM', '4:40 AM', '5:00 AM', '5:20 AM',
      '11:25 AM', '12:00 PM', '12:45 PM', '1:30 PM', '2:15 PM', '3:00 PM'
    ],
    array[
      '4:00 AM', '4:45 AM', '5:30 AM', '6:15 AM', '7:00 AM', '7:45 AM',
      '11:15 AM', '12:00 PM', '12:45 PM', '1:30 PM', '2:15 PM', '3:00 PM'
    ]
  )
on conflict (route_key) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.bus_trip_schedules;
exception
  when duplicate_object then null;
end $$;

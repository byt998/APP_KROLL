-- KROLL PWA v1
-- Run this file in the Supabase SQL Editor before starting the application.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  auth_email text,
  first_name text,
  last_name text,
  role text check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.registration_allowlist (
  phone text primary key check (phone ~ '^[0-9]{9}$'),
  role text not null default 'user' check (role in ('user', 'admin')),
  claimed_by uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cities_name_normalized_idx
on public.cities ((lower(btrim(name))));

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  title text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  import_name text not null,
  original_filename text,
  source_type text not null check (source_type in ('row_table', 'wide_cost_table')),
  sheets_count integer not null default 0,
  total_imported_rows_count integer not null default 0,
  total_skipped_rows_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.import_sheets (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  import_batch_id uuid not null references public.import_batches (id) on delete cascade,
  sheet_name text not null,
  sheet_index integer not null,
  source_type text not null check (source_type in ('row_table', 'wide_cost_table')),
  imported_rows_count integer not null default 0,
  skipped_rows_count integer not null default 0,
  created_orders_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (import_batch_id, sheet_name)
);

create table if not exists public.imported_orders (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  import_batch_id uuid not null references public.import_batches (id) on delete cascade,
  import_sheet_id uuid not null references public.import_sheets (id) on delete cascade,
  source_type text not null check (source_type in ('row_table', 'wide_cost_table')),
  source_row_number integer,
  source_column_name text,
  address text,
  decision_number text,
  case_number text,
  work_scope text,
  species text,
  circumference text,
  unit text,
  quantity numeric,
  unit_price_net numeric,
  unit_price_gross numeric,
  total_value_net numeric,
  total_value_gross numeric,
  notes text,
  raw_data jsonb,
  is_removed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.imported_orders
add column if not exists is_removed boolean not null default false;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  import_sheet_id uuid references public.import_sheets (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  order_name text,
  description text,
  status text not null default 'active' check (status in ('active', 'completed')),
  notes text,
  latitude numeric,
  longitude numeric,
  completion_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.orders
add column if not exists assigned_to uuid references public.profiles (id) on delete set null;

alter table public.orders
add column if not exists latitude numeric;

alter table public.orders
add column if not exists longitude numeric;

alter table public.orders
add column if not exists completion_notes text;

alter table public.orders
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  imported_order_id uuid not null references public.imported_orders (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (order_id, imported_order_id)
);

create table if not exists public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid references auth.users (id) on delete set null,
  photo_stage text not null default 'admin' check (photo_stage in ('admin', 'completion')),
  created_at timestamptz not null default now()
);

create index if not exists idx_import_batches_city_id
on public.import_batches (city_id);

create index if not exists idx_import_sheets_batch_id
on public.import_sheets (import_batch_id);

create index if not exists idx_imported_orders_city_id
on public.imported_orders (city_id);

create index if not exists idx_imported_orders_batch_id
on public.imported_orders (import_batch_id);

create index if not exists idx_imported_orders_sheet_id
on public.imported_orders (import_sheet_id);

create index if not exists idx_imported_orders_sheet_removed
on public.imported_orders (import_sheet_id, is_removed);

create index if not exists idx_orders_city_id
on public.orders (city_id);

create index if not exists idx_orders_sheet_id
on public.orders (import_sheet_id);

create index if not exists idx_orders_assigned_to
on public.orders (assigned_to);

create index if not exists idx_order_items_order_id
on public.order_items (order_id);

create index if not exists idx_order_items_imported_order_id
on public.order_items (imported_order_id);

create index if not exists idx_order_photos_order_id
on public.order_photos (order_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-photos',
  'order-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.registration_allowlist enable row level security;
alter table public.announcements enable row level security;
alter table public.cities enable row level security;
alter table public.work_orders enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_sheets enable row level security;
alter table public.imported_orders enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_photos enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- The browser never reads the allowlist table directly. It can only call the
-- narrow can_register_phone function below.
revoke all on table public.registration_allowlist from anon, authenticated;

revoke all on table public.announcements from anon, authenticated;
grant select, insert, update, delete on table public.announcements to authenticated;

revoke all on table public.cities from anon, authenticated;
grant select, insert, delete on table public.cities to authenticated;

revoke all on table public.work_orders from anon, authenticated;
grant select on table public.work_orders to authenticated;

revoke all on table public.import_batches from anon, authenticated;
grant select, insert, update, delete on table public.import_batches to authenticated;

revoke all on table public.import_sheets from anon, authenticated;
grant select, insert, update, delete on table public.import_sheets to authenticated;

revoke all on table public.imported_orders from anon, authenticated;
grant select, insert, update, delete on table public.imported_orders to authenticated;

revoke all on table public.orders from anon, authenticated;
grant select, insert, update, delete on table public.orders to authenticated;

revoke all on table public.order_items from anon, authenticated;
grant select, insert, update, delete on table public.order_items to authenticated;

revoke all on table public.order_photos from anon, authenticated;
grant select, insert, update, delete on table public.order_photos to authenticated;

create or replace function public.normalize_polish_phone(phone_input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select
    case
      when length(digits) = 11 and digits like '48%' then substring(digits from 3)
      else digits
    end
  from (
    select regexp_replace(coalesce(phone_input, ''), '[^0-9]', '', 'g') as digits
  ) as cleaned;
$$;

create or replace function public.can_register_phone(phone_input text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.registration_allowlist
    where phone = public.normalize_polish_phone(phone_input)
      and claimed_by is null
  );
$$;

revoke all on function public.normalize_polish_phone(text) from public;
revoke all on function public.can_register_phone(text) from public;
grant execute on function public.can_register_phone(text) to anon, authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using (public.current_user_is_admin());

drop function if exists public.get_cities_with_stats();
create function public.get_cities_with_stats()
returns table (
  id uuid,
  name text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_orders integer,
  completed_orders integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.created_by,
    c.created_at,
    c.updated_at,
    count(o.id)::integer as total_orders,
    count(o.id) filter (where o.status = 'completed')::integer as completed_orders
  from public.cities c
  left join public.orders o on o.city_id = c.id
  where public.current_user_is_admin()
  group by c.id, c.name, c.created_by, c.created_at, c.updated_at
  order by lower(c.name), c.name;
$$;

revoke all on function public.get_cities_with_stats() from public;
grant execute on function public.get_cities_with_stats() to authenticated;

create or replace function public.get_order_public_items()
returns table (
  order_id uuid,
  imported_order_id uuid,
  address text,
  work_scope text,
  species text,
  circumference text,
  quantity numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    oi.order_id,
    oi.imported_order_id,
    io.address,
    io.work_scope,
    io.species,
    io.circumference,
    io.quantity
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.imported_orders io on io.id = oi.imported_order_id
  where exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
  )
  order by o.created_at desc, io.source_row_number nulls last, io.created_at;
$$;

revoke all on function public.get_order_public_items() from public;
grant execute on function public.get_order_public_items() to authenticated;

drop policy if exists "Authenticated users can read announcements" on public.announcements;
create policy "Authenticated users can read announcements"
on public.announcements
for select
to authenticated
using (true);

drop policy if exists "Admins can insert announcements" on public.announcements;
create policy "Admins can insert announcements"
on public.announcements
for insert
to authenticated
with check (
  public.current_user_is_admin()
  and created_by = (select auth.uid())
);

drop policy if exists "Admins can update announcements" on public.announcements;
create policy "Admins can update announcements"
on public.announcements
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can delete announcements"
on public.announcements
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can read cities" on public.cities;
create policy "Admins can read cities"
on public.cities
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Authenticated users can read cities" on public.cities;
create policy "Authenticated users can read cities"
on public.cities
for select
to authenticated
using (true);

drop policy if exists "Admins can insert cities" on public.cities;
create policy "Admins can insert cities"
on public.cities
for insert
to authenticated
with check (
  public.current_user_is_admin()
  and created_by = (select auth.uid())
);

drop policy if exists "Admins can delete cities" on public.cities;
create policy "Admins can delete cities"
on public.cities
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can read work orders" on public.work_orders;
create policy "Admins can read work orders"
on public.work_orders
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can manage import batches" on public.import_batches;
create policy "Admins can manage import batches"
on public.import_batches
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can manage import sheets" on public.import_sheets;
create policy "Admins can manage import sheets"
on public.import_sheets
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can manage imported orders" on public.imported_orders;
create policy "Admins can manage imported orders"
on public.imported_orders
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Authenticated users can read orders" on public.orders;
create policy "Authenticated users can read orders"
on public.orders
for select
to authenticated
using (true);

drop policy if exists "Admins can insert orders" on public.orders;
create policy "Admins can insert orders"
on public.orders
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Authenticated users can complete orders" on public.orders;
create policy "Authenticated users can complete orders"
on public.orders
for update
to authenticated
using (true)
with check (status = 'completed');

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Authenticated users can read order photos" on public.order_photos;
create policy "Authenticated users can read order photos"
on public.order_photos
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert order photos" on public.order_photos;
create policy "Authenticated users can insert order photos"
on public.order_photos
for insert
to authenticated
with check (uploaded_by = (select auth.uid()));

drop policy if exists "Admins can manage order photos" on public.order_photos;
create policy "Admins can manage order photos"
on public.order_photos
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Authenticated users can upload order photos" on storage.objects;
create policy "Authenticated users can upload order photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'order-photos');

drop policy if exists "Authenticated users can read order photo objects" on storage.objects;
create policy "Authenticated users can read order photo objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'order-photos');

drop policy if exists "Admins can manage order photo objects" on storage.objects;
create policy "Admins can manage order photo objects"
on storage.objects
for all
to authenticated
using (bucket_id = 'order-photos' and public.current_user_is_admin())
with check (bucket_id = 'order-photos' and public.current_user_is_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_cities_updated_at on public.cities;
create trigger set_cities_updated_at
  before update on public.cities
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_work_orders_updated_at on public.work_orders;
create trigger set_work_orders_updated_at
  before update on public.work_orders
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_phone text;
  assigned_role text;
begin
  normalized_phone := public.normalize_polish_phone(
    coalesce(
      new.raw_user_meta_data ->> 'phone',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );

  if normalized_phone !~ '^[0-9]{9}$' then
    raise exception 'Podaj poprawny numer telefonu';
  end if;

  update public.registration_allowlist
  set claimed_by = new.id
  where phone = normalized_phone
    and claimed_by is null
  returning role into assigned_role;

  if not found then
    raise exception 'Numer telefonu nie znajduje sie na liscie dozwolonych numerow';
  end if;

  insert into public.profiles (
    id,
    phone,
    auth_email,
    first_name,
    last_name,
    role
  )
  values (
    new.id,
    normalized_phone,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    assigned_role
  );

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

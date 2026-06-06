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

alter table public.profiles enable row level security;
alter table public.registration_allowlist enable row level security;
alter table public.announcements enable row level security;
alter table public.cities enable row level security;
alter table public.work_orders enable row level security;

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

create or replace function public.get_cities_with_stats()
returns table (
  id uuid,
  name text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_orders integer,
  completed_orders integer,
  active_orders integer
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
    count(wo.id)::integer as total_orders,
    count(wo.id) filter (where wo.status = 'completed')::integer as completed_orders,
    count(wo.id) filter (where wo.status = 'active')::integer as active_orders
  from public.cities c
  left join public.work_orders wo on wo.city_id = c.id
  where public.current_user_is_admin()
  group by c.id, c.name, c.created_by, c.created_at, c.updated_at
  order by lower(c.name), c.name;
$$;

revoke all on function public.get_cities_with_stats() from public;
grant execute on function public.get_cities_with_stats() to authenticated;

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

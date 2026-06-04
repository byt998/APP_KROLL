-- KROLL PWA v1
-- Run this file in the Supabase SQL Editor before starting the application.

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

alter table public.profiles enable row level security;
alter table public.registration_allowlist enable row level security;

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

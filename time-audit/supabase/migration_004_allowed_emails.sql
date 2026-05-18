-- Migration 004 · Database-managed allow-list for sign-ups
-- Replaces the client-side VITE_ALLOWED_EMAIL env var with a Supabase table
-- you can edit from the app's Settings page (admins only).

create table if not exists public.allowed_emails (
  email      text primary key,
  is_admin   boolean not null default false,
  added_by   uuid references auth.users(id) on delete set null,
  added_at   timestamptz not null default now(),
  note       text
);

create index if not exists allowed_emails_email_lower_idx
  on public.allowed_emails (lower(email));

-- Seed the founder so we don't lock ourselves out.
insert into public.allowed_emails (email, is_admin, note)
values ('david@alot.land', true, 'Founder')
on conflict (email) do update set is_admin = true;

-- RLS: only admins can SELECT / INSERT / UPDATE / DELETE this table directly.
alter table public.allowed_emails enable row level security;

drop policy if exists "admins manage allowed_emails" on public.allowed_emails;
create policy "admins manage allowed_emails" on public.allowed_emails
  for all to authenticated
  using (
    exists (
      select 1
      from public.allowed_emails ae
      where lower(ae.email) = lower(auth.jwt() ->> 'email')
        and ae.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.allowed_emails ae
      where lower(ae.email) = lower(auth.jwt() ->> 'email')
        and ae.is_admin = true
    )
  );

-- Public RPC the sign-in page calls BEFORE sending a magic link.
-- security definer so it bypasses RLS for the lookup.
create or replace function public.is_email_allowed(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(p_email)
  );
$$;

grant execute on function public.is_email_allowed(text) to anon, authenticated;

-- Convenience RPC the app calls to know whether the signed-in user is an admin.
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin
     from public.allowed_emails
     where lower(email) = lower(auth.jwt() ->> 'email')),
    false
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

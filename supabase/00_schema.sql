-- D&D Master Hub — Supabase PostgreSQL schema, RLS, Realtime and Storage.
-- IDs are TEXT on purpose: the same Drizzle schema supports local demo IDs and Supabase auth.uid()::text.
-- Run this in the Supabase SQL Editor before supabase/01_demo.sql.

create schema if not exists extensions;
do $$ begin
  create extension if not exists pgcrypto with schema extensions;
exception when others then null;
end $$;

create table if not exists public.profiles (
  id text primary key,
  display_name text not null,
  role text not null default 'player' check (role in ('dm', 'player')),
  avatar_url text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key,
  dm_id text not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  invite_code text not null constraint campaigns_invite_code_unique unique,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id text not null references public.campaigns(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  owner_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  class_key text not null,
  species text not null,
  level integer not null default 1,
  hp_current integer not null default 1,
  hp_max integer not null default 1,
  armor_class integer not null default 10,
  stats jsonb not null default '{}'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  spells jsonb not null default '{"slots":{},"used":{},"list":[]}'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text not null,
  is_dm_only boolean not null default false,
  session_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.encounters (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dice_rolls (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  actor_id text not null,
  actor_name text not null,
  expression text not null,
  result integer not null,
  detail jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists characters_campaign_idx on public.characters(campaign_id);
create index if not exists sessions_campaign_idx on public.sessions(campaign_id);
create index if not exists encounters_campaign_idx on public.encounters(campaign_id);
create index if not exists dice_rolls_campaign_idx on public.dice_rolls(campaign_id);

-- Auth profile bootstrap.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role, email, avatar_url)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'player'), '@', 1), 'Путешественник'),
    case when new.raw_user_meta_data->>'role' = 'dm' then 'dm' else 'player' end,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at before update on public.characters
for each row execute function public.set_updated_at();
drop trigger if exists encounters_set_updated_at on public.encounters;
create trigger encounters_set_updated_at before update on public.encounters
for each row execute function public.set_updated_at();

-- SECURITY DEFINER helpers avoid recursive RLS lookups.
create or replace function public.is_dm_of(p_campaign_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.campaigns c
    join public.profiles p on p.id = c.dm_id
    where c.id = p_campaign_id and c.dm_id = auth.uid()::text and p.role = 'dm'
  );
$$;

create or replace function public.is_member_of(p_campaign_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign_id and m.user_id = auth.uid()::text
  ) or public.is_dm_of(p_campaign_id);
$$;

create or replace function public.join_campaign_by_code(p_code text)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare v_campaign public.campaigns;
begin
  if auth.uid() is null then raise exception 'Требуется вход в Supabase Auth'; end if;
  select * into v_campaign from public.campaigns where upper(invite_code) = upper(trim(p_code));
  if not found then raise exception 'Код приглашения не найден'; end if;
  insert into public.campaign_members (campaign_id, user_id)
  values (v_campaign.id, auth.uid()::text) on conflict do nothing;
  return v_campaign;
end $$;

grant execute on function public.is_dm_of(text) to authenticated;
grant execute on function public.is_member_of(text) to authenticated;
grant execute on function public.join_campaign_by_code(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.sessions enable row level security;
alter table public.encounters enable row level security;
alter table public.dice_rolls enable row level security;

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);

drop policy if exists "campaigns_read" on public.campaigns;
create policy "campaigns_read" on public.campaigns for select to authenticated
using (dm_id = auth.uid()::text or public.is_member_of(id));
drop policy if exists "campaigns_create" on public.campaigns;
create policy "campaigns_create" on public.campaigns for insert to authenticated
with check (dm_id = auth.uid()::text and exists (select 1 from public.profiles p where p.id = auth.uid()::text and p.role = 'dm'));
drop policy if exists "campaigns_modify" on public.campaigns;
create policy "campaigns_modify" on public.campaigns for update to authenticated
using (public.is_dm_of(id)) with check (public.is_dm_of(id));
drop policy if exists "campaigns_delete" on public.campaigns;
create policy "campaigns_delete" on public.campaigns for delete to authenticated using (public.is_dm_of(id));

drop policy if exists "members_read" on public.campaign_members;
create policy "members_read" on public.campaign_members for select to authenticated
using (user_id = auth.uid()::text or public.is_dm_of(campaign_id));
drop policy if exists "members_join" on public.campaign_members;
create policy "members_join" on public.campaign_members for insert to authenticated
with check (user_id = auth.uid()::text or public.is_dm_of(campaign_id));
drop policy if exists "members_remove" on public.campaign_members;
create policy "members_remove" on public.campaign_members for delete to authenticated
using (user_id = auth.uid()::text or public.is_dm_of(campaign_id));

drop policy if exists "characters_read" on public.characters;
create policy "characters_read" on public.characters for select to authenticated
using (owner_id = auth.uid()::text or public.is_dm_of(campaign_id));
drop policy if exists "characters_create" on public.characters;
create policy "characters_create" on public.characters for insert to authenticated
with check (public.is_member_of(campaign_id) and (owner_id = auth.uid()::text or public.is_dm_of(campaign_id)));
drop policy if exists "characters_modify" on public.characters;
create policy "characters_modify" on public.characters for update to authenticated
using (owner_id = auth.uid()::text or public.is_dm_of(campaign_id))
with check (owner_id = auth.uid()::text or public.is_dm_of(campaign_id));
drop policy if exists "characters_delete" on public.characters;
create policy "characters_delete" on public.characters for delete to authenticated
using (owner_id = auth.uid()::text or public.is_dm_of(campaign_id));

drop policy if exists "sessions_read" on public.sessions;
create policy "sessions_read" on public.sessions for select to authenticated
using (public.is_dm_of(campaign_id) or (not is_dm_only and public.is_member_of(campaign_id)));
drop policy if exists "sessions_create" on public.sessions;
create policy "sessions_create" on public.sessions for insert to authenticated
with check (
  author_id = auth.uid()::text
  and public.is_member_of(campaign_id)
  and (not is_dm_only or public.is_dm_of(campaign_id))
);
drop policy if exists "sessions_modify" on public.sessions;
create policy "sessions_modify" on public.sessions for update to authenticated
using (author_id = auth.uid()::text or public.is_dm_of(campaign_id))
with check (not is_dm_only or public.is_dm_of(campaign_id));
drop policy if exists "sessions_delete" on public.sessions;
create policy "sessions_delete" on public.sessions for delete to authenticated
using (author_id = auth.uid()::text or public.is_dm_of(campaign_id));

drop policy if exists "encounters_read" on public.encounters;
create policy "encounters_read" on public.encounters for select to authenticated
using (public.is_member_of(campaign_id));
drop policy if exists "encounters_create" on public.encounters;
create policy "encounters_create" on public.encounters for insert to authenticated
with check (public.is_dm_of(campaign_id));
drop policy if exists "encounters_modify" on public.encounters;
create policy "encounters_modify" on public.encounters for update to authenticated
using (public.is_member_of(campaign_id)) with check (public.is_member_of(campaign_id));
drop policy if exists "encounters_delete" on public.encounters;
create policy "encounters_delete" on public.encounters for delete to authenticated
using (public.is_dm_of(campaign_id));

drop policy if exists "rolls_read" on public.dice_rolls;
create policy "rolls_read" on public.dice_rolls for select to authenticated
using (public.is_member_of(campaign_id));
drop policy if exists "rolls_create" on public.dice_rolls;
create policy "rolls_create" on public.dice_rolls for insert to authenticated
with check (actor_id = auth.uid()::text and public.is_member_of(campaign_id));

-- Avatars bucket: one folder per user, public read, owner-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select to public
using (bucket_id = 'avatars');
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime: dice, initiative and character HP are shared between PC and phone.
alter table public.dice_rolls replica identity full;
alter table public.encounters replica identity full;
alter table public.characters replica identity full;
alter table public.sessions replica identity full;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['dice_rolls','encounters','characters','sessions'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

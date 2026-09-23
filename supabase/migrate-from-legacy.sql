-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Drops the simplified/legacy tables and recreates the full schema.

-- 1. Drop existing tables (cascades dependent objects)
drop table if exists messages cascade;
drop table if exists chats cascade;
drop table if exists files cascade;
drop table if exists projects cascade;
drop table if exists users cascade;

-- 2. Recreate everything (matches supabase/schema.sql)
-- Random 4-digit sign-in code, e.g. '0423'
create or replace function generate_code() returns text
  language sql volatile as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
$$;

create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  code text unique not null default generate_code(),  -- 4-digit code, given to the student in person
  created_at timestamptz default now()
);

-- Admin helper: create a user with a random code and get the code back.
-- Run in the Supabase SQL editor:  select create_club_user('chaim');
create or replace function create_club_user(p_username text) returns text
  language plpgsql as $$
declare
  v_username text := btrim(p_username);
  v_code text;
begin
  if v_username is null or char_length(v_username) = 0 then
    raise exception 'username is required';
  end if;
  if char_length(v_username) > 32 then
    raise exception 'username must be at most 32 characters';
  end if;
  if exists (select 1 from users u where u.username = v_username) then
    raise exception 'username % is already taken', v_username;
  end if;
  loop
    v_code := generate_code();
    begin
      insert into users (username, code) values (v_username, v_code);
      return v_code;
    exception when unique_violation then
      -- code collision; pick a fresh random code and retry
      null;
    end;
  end loop;
end $$;

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_folder_id uuid references files(id) on delete cascade, -- null = root
  name text not null,
  type text not null check (type in ('file','folder')),
  content text,                      -- null for folders
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- indexes
create index files_project_idx on files (project_id);
create index files_parent_idx on files (parent_folder_id);
create index chats_project_idx on chats (project_id);
create index messages_chat_idx on messages (chat_id);

-- Lock down anonymous API access (see schema.sql for the rationale).
alter table users enable row level security;
alter table projects enable row level security;
alter table files enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;

revoke execute on function generate_code() from public, anon, authenticated;
revoke execute on function create_club_user(text) from public, anon, authenticated;

-- auto-touch updated_at
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array['projects','files','chats']) loop
    execute format('drop trigger if exists trg_touch_%I on %I;', t, t);
    execute format('create trigger trg_touch_%I before update on %I for each row execute function touch_updated_at();', t, t);
  end loop;
end $$;
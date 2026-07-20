-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Drops the simplified/legacy tables and recreates the full schema.

-- 1. Drop existing tables (cascades dependent objects)
drop table if exists messages cascade;
drop table if exists chats cascade;
drop table if exists files cascade;
drop table if exists projects cascade;
drop table if exists users cascade;

-- 2. Recreate everything (matches supabase/schema.sql)
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,            -- bcrypt hash
  created_at timestamptz default now()
);

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
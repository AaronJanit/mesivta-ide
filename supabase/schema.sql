-- Run in the Supabase SQL editor for project imrbzsjazjdkaiofqmzu.

-- users (custom auth — passwords are bcrypt hashes from the app)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,            -- bcrypt hash
  created_at timestamptz default now()
);

-- projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- files (folders + files in one self-referential table)
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_folder_id uuid references files(id) on delete cascade, -- null = root
  name text not null,
  type text not null check (type in ('file','folder')),
  content text,                      -- null for folders
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- chats
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- indexes
create index if not exists files_project_idx on files (project_id);
create index if not exists files_parent_idx on files (parent_folder_id);
create index if not exists chats_project_idx on chats (project_id);
create index if not exists messages_chat_idx on messages (chat_id);

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

-- NOTE on RLS: This app uses custom session-cookie auth (no Supabase Auth).
-- Every API route validates the session server-side, so access is already gated.
-- RLS is left OFF for simplicity on this self-hosted single-user IDE. Enable
-- with policies that join projects.user_id if you later need defense-in-depth.
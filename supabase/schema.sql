-- Run in the Supabase SQL editor for project imrbzsjazjdkaiofqmzu.

-- Random 4-digit sign-in code, e.g. '0423'
create or replace function generate_code() returns text
  language sql volatile as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
$$;

-- users (custom auth — sign-in is a 4-digit code created by the admin)
create table if not exists users (
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

-- Lock down anonymous API access. The app uses the service-role key, which
-- bypasses RLS, so this changes nothing for the app — but it stops anyone
-- holding the anon key (it ships in the browser bundle) from reading users'
-- sign-in codes or data through the REST API. No policies = zero rows for
-- anon/authenticated.
alter table users enable row level security;
alter table projects enable row level security;
alter table files enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;

-- Keep the helper functions callable only from the SQL editor (admin), not
-- through the public REST API.
revoke execute on function generate_code() from public, anon, authenticated;
revoke execute on function create_club_user(text) from public, anon, authenticated;
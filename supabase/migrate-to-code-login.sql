-- One-off migration: switch from username+password to 4-digit-code sign-in.
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- for project imrbzsjazjdkaiofqmzu. After it completes, create users with:
--   select create_club_user('name');
-- which returns the student's random 4-digit code to give them in person.

-- 1. Random 4-digit code generator (e.g. '0423')
create or replace function generate_code() returns text
  language sql volatile as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
$$;

-- 2. Add the code column (existing rows stay null for now)
alter table users add column if not exists code text;

-- 3. Unique codes. Multiple NULLs are allowed, so this is safe pre-backfill.
create unique index if not exists users_code_key on users (code);

-- 4. Backfill: give every existing user a random code (retries on collision)
do $$
declare
  r record;
  v_code text;
begin
  for r in select id from users where code is null loop
    loop
      v_code := generate_code();
      begin
        update users set code = v_code where id = r.id and code is null;
        exit;
      exception when unique_violation then
        null; -- collision with another user's code; pick a fresh one
      end;
    end loop;
  end loop;
end $$;

-- 5. Codes are now required; new rows get a random code by default
alter table users alter column code set not null;
alter table users alter column code set default generate_code();

-- 6. Passwords are gone — sign-in is code-only
alter table users drop column if exists password;

-- 7. Admin helper: create a user with a random code and get the code back
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

-- 8. Lock down anonymous API access.
-- The app talks to Supabase with the service-role key, which bypasses RLS, so
-- enabling RLS changes nothing for the app — but it stops anyone holding the
-- anon key (it ships in the browser bundle) from reading users' codes or data
-- through the REST API. No policies = zero rows for anon/authenticated.
alter table users enable row level security;
alter table projects enable row level security;
alter table files enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;

-- Keep the helper functions callable only from the SQL editor (admin), not
-- through the public REST API.
revoke execute on function generate_code() from public, anon, authenticated;
revoke execute on function create_club_user(text) from public, anon, authenticated;

-- NOTE: PostgREST refreshes its schema cache shortly after DDL. If logins
-- still fail with "Could not find the 'code' column" right after running
-- this, wait ~30 seconds or run:  NOTIFY pgrst, 'reload schema cache';
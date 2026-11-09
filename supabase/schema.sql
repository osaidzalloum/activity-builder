-- Activity Builder: tables, Row Level Security policies, and the live session functions.
-- Run this whole file once, in the SQL Editor of an empty Supabase project.
-- The browser talks to the database directly, so these policies are the real protection,
-- not the public key.

-- =====================================================================
-- Activities: each activity belongs to a teacher and stores its questions as JSON.
-- =====================================================================
create table activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users default auth.uid(),
  title text not null default 'نشاط جديد',
  questions jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table activities enable row level security;

-- Anyone with the link can view an activity (students don't need accounts).
create policy "Anyone can read activities"
  on activities for select using (true);

-- Only the logged-in owner can create, edit, or delete their activities.
create policy "Owners can insert their activities"
  on activities for insert with check (auth.uid() = owner_id);

create policy "Owners can update their activities"
  on activities for update using (auth.uid() = owner_id);

create policy "Owners can delete their activities"
  on activities for delete using (auth.uid() = owner_id);

-- =====================================================================
-- Attempts: what a student submits after solving an activity.
-- =====================================================================
create table attempts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 50),
  score int not null check (score >= 0),
  total int not null check (total > 0 and score <= total),
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table attempts enable row level security;

-- Anyone can submit an attempt, but only for an activity that exists.
create policy "Anyone can submit attempts"
  on attempts for insert
  with check (exists (select 1 from activities where id = activity_id));

-- Only the activity's owner can read its attempts.
create policy "Owners can read attempts for their activities"
  on attempts for select
  using (exists (
    select 1 from activities
    where activities.id = attempts.activity_id
      and activities.owner_id = auth.uid()
  ));

-- Only the activity's owner can delete its attempts.
create policy "Owners can delete attempts for their activities"
  on attempts for delete
  using (exists (
    select 1 from activities
    where activities.id = attempts.activity_id
      and activities.owner_id = auth.uid()
  ));

-- =====================================================================
-- Live sessions: a teacher runs an activity live, students join with a code.
-- =====================================================================
create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  host_id uuid not null references auth.users default auth.uid(),
  code text not null unique,
  state jsonb not null default '{"status":"lobby"}',
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  scoring_mode text not null default 'fixed' check (scoring_mode in ('fixed', 'speed')),
  results jsonb not null default '{"players":{},"questions":[]}',
  check (state->>'status' in ('lobby', 'question', 'reveal', 'finished'))
);

alter table live_sessions enable row level security;

-- Only the host can see and manage their sessions.
-- Note: there is NO public select policy. Students never read this table directly.
create policy "Hosts can read their sessions"
  on live_sessions for select using (auth.uid() = host_id);

create policy "Hosts can create sessions for their own activities"
  on live_sessions for insert
  with check (
    auth.uid() = host_id
    and exists (
      select 1 from activities
      where activities.id = activity_id and activities.owner_id = auth.uid()
    )
  );

create policy "Hosts can update their sessions"
  on live_sessions for update
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- Only an ended session can be deleted, so a running one cannot be removed from anywhere.
create policy "Hosts can delete their ended sessions"
  on live_sessions for delete
  using (auth.uid() = host_id and ended_at is not null);

-- Students join by code through this function only.
-- It returns at most one active session, so nobody can list all codes.
create or replace function join_session(p_code text)
returns table (session_id uuid, activity_id uuid, state jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.activity_id, s.state
  from live_sessions s
  where s.code = upper(trim(p_code)) and s.ended_at is null
  limit 1;
$$;

revoke all on function join_session(text) from public;
grant execute on function join_session(text) to anon, authenticated;

-- Creates a session with a unique 6-character code.
-- Runs with the caller's rights, so the insert policy above still applies.
create or replace function create_live_session(p_activity_id uuid)
returns live_sessions
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  result live_sessions;
  attempts int := 0;
  i int;
begin
  loop
    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'Could not generate a unique session code';
    end if;

    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    begin
      insert into live_sessions (activity_id, code)
      values (p_activity_id, new_code)
      returning * into result;
      return result;
    exception when unique_violation then
      null; -- code already taken, try another one
    end;
  end loop;
end;
$$;

revoke all on function create_live_session(uuid) from public;
grant execute on function create_live_session(uuid) to authenticated;

-- =====================================================================
-- Table privileges. Row Level Security decides which rows; these decide which
-- operations a role may even try. Spelled out so the file does not depend on a
-- project's default privileges.
-- =====================================================================
grant select on activities to anon, authenticated;
grant insert, update, delete on activities to authenticated;

grant insert on attempts to anon, authenticated;
grant select, delete on attempts to authenticated;

-- students never touch this table directly: they go through join_session
grant select, insert, update, delete on live_sessions to authenticated;

-- =====================================================================
-- Private Realtime channels
--
-- A live session uses two channels, so a role can be told apart by the channel it may use
-- (a policy on realtime.messages can only look at the topic and the message type):
--   live:CODE     host -> students: questions, reveals, the end, and who is connected (presence)
--   answers:CODE  students -> host: the answers, and nothing else
-- =====================================================================

-- Anonymous users (students signed in without an account) use the "authenticated" role.
-- Teacher-only actions must therefore refuse them explicitly.
create policy "Only permanent users can create activities"
  on activities as restrictive for insert
  to authenticated
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);

-- The channel policies cannot read live_sessions (only the host may), so they ask these two
-- functions, which return a yes or no and nothing else.
create or replace function live_session_is_active(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from live_sessions s where s.code = p_code and s.ended_at is null
  );
$$;

create or replace function live_session_is_host(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from live_sessions s where s.code = p_code and s.host_id = (select auth.uid())
  );
$$;

revoke all on function live_session_is_active(text) from public;
revoke all on function live_session_is_host(text) from public;
grant execute on function live_session_is_active(text) to authenticated;
grant execute on function live_session_is_host(text) to authenticated;

-- The host: receives and sends on the session's channel, and receives the answers.
create policy "Host receives and sends on the live channel"
  on realtime.messages for select
  to authenticated
  using (
    (select realtime.topic()) like 'live:%'
    and realtime.messages.extension in ('broadcast', 'presence')
    and live_session_is_host(split_part((select realtime.topic()), ':', 2))
  );

create policy "Host sends on the live channel"
  on realtime.messages for insert
  to authenticated
  with check (
    (select realtime.topic()) like 'live:%'
    and realtime.messages.extension in ('broadcast', 'presence')
    and live_session_is_host(split_part((select realtime.topic()), ':', 2))
  );

create policy "Host receives the answers"
  on realtime.messages for select
  to authenticated
  using (
    (select realtime.topic()) like 'answers:%'
    and realtime.messages.extension = 'broadcast'
    and live_session_is_host(split_part((select realtime.topic()), ':', 2))
  );

-- A student of a running session: receives what the host sends and who is connected,
-- may announce their own presence, and may send answers. Nothing else:
-- no broadcast on the live channel (so no fake questions), and no reading the answers channel.
create policy "Students receive the live channel of a running session"
  on realtime.messages for select
  to authenticated
  using (
    (select realtime.topic()) like 'live:%'
    and realtime.messages.extension in ('broadcast', 'presence')
    and live_session_is_active(split_part((select realtime.topic()), ':', 2))
  );

create policy "Students announce their presence on a running session"
  on realtime.messages for insert
  to authenticated
  with check (
    (select realtime.topic()) like 'live:%'
    and realtime.messages.extension = 'presence'
    and live_session_is_active(split_part((select realtime.topic()), ':', 2))
  );

create policy "Students send their answers to a running session"
  on realtime.messages for insert
  to authenticated
  with check (
    (select realtime.topic()) like 'answers:%'
    and realtime.messages.extension = 'broadcast'
    and live_session_is_active(split_part((select realtime.topic()), ':', 2))
  );
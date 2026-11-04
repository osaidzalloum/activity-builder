-- Activities: each activity belongs to a teacher and stores its questions as JSON.
create table activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users default auth.uid(),
  title text not null default 'نشاط جديد',
  questions jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Row Level Security: the browser talks to the database directly,
-- so these policies are the real protection, not the public key.
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


  create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  host_id uuid not null references auth.users default auth.uid(),
  code text not null unique,
  state jsonb not null default '{"status":"lobby"}',
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  scoring_mode text not null default 'fixed' check (scoring_mode in ('fixed', 'speed')),
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

create policy "Hosts can delete their sessions"
  on live_sessions for delete using (auth.uid() = host_id);

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


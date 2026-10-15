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
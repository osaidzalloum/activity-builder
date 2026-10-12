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
-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

-- Preferences
create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'light',
  accent text default 'blue',
  last_subject text,
  last_topic text,
  updated_at timestamptz default now()
);

-- Practice sessions
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject text,
  topic text,
  current_index int default 0,
  answers jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Exam attempts (optional)
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subjects text[],
  question_ids jsonb,
  answers jsonb,
  score int,
  duration_sec int,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Reports (optional)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  question_id text,
  note text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.reports enable row level security;

-- Policies: only owner can access
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles') then
    create policy profiles_select on public.profiles for select using (auth.uid() = id);
    create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
    create policy profiles_update on public.profiles for update using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'preferences') then
    create policy prefs_select on public.preferences for select using (auth.uid() = user_id);
    create policy prefs_insert on public.preferences for insert with check (auth.uid() = user_id);
    create policy prefs_update on public.preferences for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'practice_sessions') then
    create policy practice_select on public.practice_sessions for select using (auth.uid() = user_id);
    create policy practice_insert on public.practice_sessions for insert with check (auth.uid() = user_id);
    create policy practice_update on public.practice_sessions for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'exam_attempts') then
    create policy exam_select on public.exam_attempts for select using (auth.uid() = user_id);
    create policy exam_insert on public.exam_attempts for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'reports') then
    create policy reports_select on public.reports for select using (auth.uid() = user_id);
    create policy reports_insert on public.reports for insert with check (auth.uid() = user_id);
  end if;
end$$;

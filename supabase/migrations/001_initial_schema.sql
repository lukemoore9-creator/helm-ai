create extension if not exists "uuid-ossp";

-- Student profiles (linked to Clerk via clerk_id)
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  clerk_id text unique not null,
  email text,
  full_name text,
  ticket_type text not null,
  exam_date date,
  has_exam_date boolean default false,
  total_sessions int default 0,
  total_minutes int default 0,
  overall_readiness numeric default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sessions (must come before topic_scores which references it)
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students on delete cascade,
  ticket_type text not null,
  status text default 'active' check (status in ('active', 'completed', 'abandoned')),
  duration_seconds int default 0,
  overall_score numeric,
  topics_covered text[],
  exchanges_count int default 0,
  ai_summary text,
  weak_areas text[],
  strong_areas text[],
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Topic scores (one row per topic per session)
create table public.topic_scores (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students on delete cascade,
  ticket_type text not null,
  topic text not null,
  score numeric not null,
  questions_asked int default 0,
  key_points_hit int default 0,
  key_points_missed int default 0,
  session_id uuid references public.sessions on delete cascade,
  assessed_at timestamptz default now()
);

-- Individual exchanges within a session
create table public.session_exchanges (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions on delete cascade,
  topic text,
  examiner_question text not null,
  candidate_answer text,
  ai_feedback text,
  score numeric,
  key_points_hit jsonb,
  key_points_missed jsonb,
  had_visual boolean default false,
  exchange_order int,
  duration_seconds int,
  created_at timestamptz default now()
);

-- Row level security
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exchanges enable row level security;
alter table public.topic_scores enable row level security;

-- Service role full access policies
create policy "Service role full access students" on public.students
  for all using (current_setting('role') = 'service_role');

create policy "Service role full access sessions" on public.sessions
  for all using (current_setting('role') = 'service_role');

create policy "Service role full access exchanges" on public.session_exchanges
  for all using (current_setting('role') = 'service_role');

create policy "Service role full access scores" on public.topic_scores
  for all using (current_setting('role') = 'service_role');

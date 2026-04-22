-- schedule_entries: substitui ws_classes_v2 do localStorage
create table if not exists public.schedule_entries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade not null,
  type        text        not null default 'class',   -- 'class' | 'sleep' | 'exercise'
  day_of_week integer     not null,                   -- 0=Dom … 6=Sáb
  start_time  text        not null,                   -- HH:MM
  end_time    text        not null,                   -- HH:MM
  subject_id  uuid        references public.subjects(id) on delete set null,
  label       text,
  repeats     boolean     not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.schedule_entries enable row level security;

create policy "Users manage own schedule entries"
  on public.schedule_entries for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Colunas extras na tabela profiles
alter table public.profiles
  add column if not exists study_start_time     text    default '08:00',
  add column if not exists active_edital_id     text,
  add column if not exists wellness_dismissed_at bigint,
  add column if not exists theme                text    default 'dark';

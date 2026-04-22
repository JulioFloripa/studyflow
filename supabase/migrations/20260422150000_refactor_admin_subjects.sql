-- Refatoração: disciplinas globais compartilhadas entre editais
-- As tabelas antigas estão vazias, então podemos recriar sem perda de dados.

drop table if exists public.admin_preset_topics;
drop table if exists public.admin_preset_subjects;

-- Biblioteca global de disciplinas (não atreladas a um edital específico)
create table if not exists public.admin_subjects (
  id         uuid    primary key default gen_random_uuid(),
  name       text    not null,
  priority   integer not null default 3,
  color      text    not null default '#6366f1',
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Assuntos de cada disciplina (global)
create table if not exists public.admin_topics (
  id         uuid    primary key default gen_random_uuid(),
  subject_id uuid    references public.admin_subjects(id) on delete cascade not null,
  name       text    not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Ligação many-to-many: edital ↔ disciplina
create table if not exists public.admin_preset_subjects (
  id         uuid    primary key default gen_random_uuid(),
  preset_id  uuid    references public.admin_presets(id) on delete cascade not null,
  subject_id uuid    references public.admin_subjects(id) on delete cascade not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  unique(preset_id, subject_id)
);

-- RLS
alter table public.admin_subjects        enable row level security;
alter table public.admin_topics          enable row level security;
alter table public.admin_preset_subjects enable row level security;

create policy "Public read admin_subjects"
  on public.admin_subjects for select using (true);
create policy "Auth write admin_subjects"
  on public.admin_subjects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public read admin_topics"
  on public.admin_topics for select using (true);
create policy "Auth write admin_topics"
  on public.admin_topics for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public read admin_preset_subjects"
  on public.admin_preset_subjects for select using (true);
create policy "Auth write admin_preset_subjects"
  on public.admin_preset_subjects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

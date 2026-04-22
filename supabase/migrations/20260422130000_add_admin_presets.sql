-- Tabelas para editais gerenciados pelo admin
create table if not exists public.admin_presets (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null,
  description text    not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.admin_preset_subjects (
  id         uuid    primary key default gen_random_uuid(),
  preset_id  uuid    references public.admin_presets(id) on delete cascade not null,
  name       text    not null,
  priority   integer not null default 3,
  color      text    not null default '#6366f1',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.admin_preset_topics (
  id         uuid    primary key default gen_random_uuid(),
  subject_id uuid    references public.admin_preset_subjects(id) on delete cascade not null,
  name       text    not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Leitura pública, escrita exige autenticação
alter table public.admin_presets          enable row level security;
alter table public.admin_preset_subjects  enable row level security;
alter table public.admin_preset_topics    enable row level security;

create policy "Public read presets"
  on public.admin_presets for select using (true);
create policy "Authenticated write presets"
  on public.admin_presets for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public read subjects"
  on public.admin_preset_subjects for select using (true);
create policy "Authenticated write subjects"
  on public.admin_preset_subjects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public read topics"
  on public.admin_preset_topics for select using (true);
create policy "Authenticated write topics"
  on public.admin_preset_topics for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

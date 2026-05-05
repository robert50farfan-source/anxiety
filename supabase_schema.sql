-- ============================================================
-- AnxietyApp — Schema para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ─── TABLAS ──────────────────────────────────────────────────

create table public.perfiles (
  id                     uuid primary key references auth.users on delete cascade,
  creado_en              timestamptz default now(),
  nombre_anonimo         text,
  ejercicios_completados int  default 0,
  dias_racha             int  default 0,
  ultima_actividad       date
);

create table public.episodios (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid        not null references public.perfiles(id) on delete cascade,
  fecha             timestamptz default now(),
  estado_emocional  int         check (estado_emocional between 1 and 5),
  desencadenante    text,
  tecnica_usada     text,
  duracion_minutos  int,
  notas             text
);

-- Índice para las queries de stats (episodios por usuario + día)
create index episodios_user_fecha_idx on public.episodios (user_id, fecha desc);

create table public.resultados_bai (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references public.perfiles(id) on delete cascade,
  fecha          timestamptz default now(),
  puntaje_total  int,
  respuestas     jsonb,
  semana_estudio int
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

alter table public.perfiles       enable row level security;
alter table public.episodios      enable row level security;
alter table public.resultados_bai enable row level security;

-- perfiles: cada usuario solo puede ver y modificar su propia fila
create policy "perfil: select propio"
  on public.perfiles for select using (auth.uid() = id);

create policy "perfil: insert propio"
  on public.perfiles for insert with check (auth.uid() = id);

create policy "perfil: update propio"
  on public.perfiles for update using (auth.uid() = id);

-- episodios
create policy "episodios: select propios"
  on public.episodios for select using (auth.uid() = user_id);

create policy "episodios: insert propios"
  on public.episodios for insert with check (auth.uid() = user_id);

create policy "episodios: update propios"
  on public.episodios for update using (auth.uid() = user_id);

-- resultados_bai
create policy "bai: select propios"
  on public.resultados_bai for select using (auth.uid() = user_id);

create policy "bai: insert propios"
  on public.resultados_bai for insert with check (auth.uid() = user_id);

-- ─── NOTAS DE CONFIGURACIÓN ──────────────────────────────────
-- 1. Habilitar autenticación anónima:
--    Supabase Dashboard > Authentication > Providers > Anonymous sign-ins → Enable
-- 2. Variables de entorno (.env.local en la raíz del proyecto):
--    VITE_SUPABASE_URL=https://<proyecto>.supabase.co
--    VITE_SUPABASE_ANON_KEY=<anon-key>

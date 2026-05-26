-- =====================================================================
-- MÓDULO PROFESIONALES Y EVENTOS DE CRISIS
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de admin-schema.sql
-- =====================================================================


-- =====================================================================
-- 1. TABLA profesionales_apoyo
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.canal_contacto AS ENUM ('llamada', 'whatsapp', 'email');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profesionales_apoyo (
  id                   UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo      TEXT                   NOT NULL,
  rol_profesional      TEXT                   NOT NULL,
  telefono             TEXT,
  whatsapp             TEXT,
  email                TEXT,
  canal_preferido      public.canal_contacto  NOT NULL,
  horario_atencion     TEXT,
  dias_disponibles     TEXT[]           NOT NULL DEFAULT '{}',
  hora_inicio          TIME,
  hora_fin             TIME,
  activo               BOOLEAN          NOT NULL DEFAULT true,
  orden_visualizacion  INTEGER          NOT NULL DEFAULT 0,
  notas_internas       TEXT,
  fecha_creacion       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  creado_por           UUID             REFERENCES public.usuarios_admin(id) ON DELETE SET NULL
);

ALTER TABLE public.profesionales_apoyo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_lee_profesionales"
    ON public.profesionales_apoyo FOR SELECT
    USING (public.es_admin_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_inserta_profesionales"
    ON public.profesionales_apoyo FOR INSERT
    WITH CHECK (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_actualiza_profesionales"
    ON public.profesionales_apoyo FOR UPDATE
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================================
-- 2. VISTA PÚBLICA para participantes
-- =====================================================================
CREATE OR REPLACE VIEW public.profesionales_apoyo_publico AS
  SELECT
    id,
    nombre_completo,
    rol_profesional,
    telefono,
    whatsapp,
    email,
    canal_preferido,
    horario_atencion,
    dias_disponibles,
    hora_inicio,
    hora_fin,
    orden_visualizacion
  FROM public.profesionales_apoyo
  WHERE activo = true
  ORDER BY orden_visualizacion ASC, fecha_creacion ASC;

GRANT SELECT ON public.profesionales_apoyo_publico TO anon, authenticated;


-- =====================================================================
-- 3. TABLA eventos_crisis
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.eventos_crisis (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL,
  timestamp                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_evento               TEXT        NOT NULL,
  profesional_contactado_id UUID        REFERENCES public.profesionales_apoyo(id) ON DELETE SET NULL,
  detalles                  JSONB
);

ALTER TABLE public.eventos_crisis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participante_inserta_crisis"
    ON public.eventos_crisis FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_crisis"
    ON public.eventos_crisis FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================================
-- 4. ÍNDICES para queries del dashboard
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_eventos_crisis_timestamp ON public.eventos_crisis (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_crisis_tipo      ON public.eventos_crisis (tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_crisis_user      ON public.eventos_crisis (user_id);


-- =====================================================================
-- SECRETOS A CONFIGURAR EN SUPABASE (Dashboard → Settings → Secrets)
-- =====================================================================
-- RESEND_API_KEY      → API key de Resend (https://resend.com)
-- INVESTIGADOR_EMAIL  → email fallback si usuarios_admin no retorna nada
-- =====================================================================

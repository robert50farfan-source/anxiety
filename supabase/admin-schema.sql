-- =====================================================================
-- MÓDULO ADMINISTRADOR — Schema completo
-- Idempotente: se puede re-ejecutar sin errores
-- =====================================================================


-- =====================================================================
-- 1. TIPO ENUM Y TABLA usuarios_admin
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.rol_admin AS ENUM ('investigador', 'tutora');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.usuarios_admin (
  id              UUID             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT             UNIQUE NOT NULL,
  nombre_completo TEXT             NOT NULL,
  rol             public.rol_admin NOT NULL,
  activo          BOOLEAN          NOT NULL DEFAULT true,
  fecha_creacion  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  ultima_sesion   TIMESTAMPTZ,
  creado_por      UUID             REFERENCES public.usuarios_admin(id) ON DELETE SET NULL
);

ALTER TABLE public.usuarios_admin ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 2. FUNCIONES AUXILIARES
--    SECURITY DEFINER: corren como postgres, bypass de RLS interno
-- =====================================================================
CREATE OR REPLACE FUNCTION public.es_investigador_activo()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_admin
    WHERE id = auth.uid()
      AND rol = 'investigador'
      AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.es_admin_activo()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_admin
    WHERE id = auth.uid()
      AND activo = true
  );
$$;


-- =====================================================================
-- 3. POLÍTICAS RLS DE usuarios_admin (idempotentes)
-- =====================================================================
DO $$ BEGIN
  CREATE POLICY "admin_lee_propio"
    ON public.usuarios_admin FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_todos"
    ON public.usuarios_admin FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_inserta"
    ON public.usuarios_admin FOR INSERT
    WITH CHECK (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_actualiza"
    ON public.usuarios_admin FOR UPDATE
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================================
-- 4. TABLA auditoria_admin
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_admin (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID        REFERENCES public.usuarios_admin(id) ON DELETE SET NULL,
  accion     TEXT        NOT NULL,
  entidad    TEXT,
  entidad_id UUID,
  detalles   JSONB,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auditoria_admin ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_auditoria"
    ON public.auditoria_admin FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "admin_inserta_auditoria"
    ON public.auditoria_admin FOR INSERT
    WITH CHECK (public.es_admin_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================================
-- 5. TABLA configuracion_estudio (singleton — id siempre = 1)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.configuracion_estudio (
  id                      INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_estudio          TEXT        NOT NULL DEFAULT 'Estudio de Ansiedad en Estudiantes Universitarios',
  fecha_inicio            DATE,
  participantes_esperados INT         NOT NULL DEFAULT 0,
  descripcion             TEXT,
  actualizado_por         UUID        REFERENCES public.usuarios_admin(id) ON DELETE SET NULL,
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.configuracion_estudio ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_lee_config"
    ON public.configuracion_estudio FOR SELECT
    USING (public.es_admin_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_actualiza_config"
    ON public.configuracion_estudio FOR UPDATE
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.configuracion_estudio (id, nombre_estudio, participantes_esperados)
VALUES (1, 'Estudio de Ansiedad en Estudiantes Universitarios', 50)
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- 6. POLÍTICAS RLS EN TABLAS DE PARTICIPANTES
-- =====================================================================
DO $$ BEGIN
  CREATE POLICY "investigador_lee_perfiles"
    ON public.perfiles FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_episodios"
    ON public.episodios FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_chat"
    ON public.chat_mensajes FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================================
-- 7. CREAR EL PRIMER INVESTIGADOR MANUALMENTE
-- =====================================================================
--
-- PASO A — En Supabase Dashboard:
--   Authentication > Users > "Add user"
--   Ingresa email y password. Copia el UUID de la columna "User UID".
--
-- PASO B — Ejecuta (reemplaza los valores):
--
--   INSERT INTO public.usuarios_admin (id, email, nombre_completo, rol)
--   VALUES (
--     'UUID-COPIADO-DEL-PASO-A',
--     'email@ejemplo.com',
--     'Nombre Completo',
--     'investigador'
--   );
--
-- =====================================================================

-- =====================================================================
-- MÓDULO PARTICIPANTES — Schema completo
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de admin-schema.sql
-- =====================================================================

-- ENUMs
DO $$ BEGIN
  CREATE TYPE public.estado_participante AS ENUM (
    'codigo_generado', 'codigo_asignado', 'consentimiento_firmado',
    'activo', 'retirado', 'completado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.grupo_estudio AS ENUM ('experimental', 'control');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS public.participantes (
  id                       UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_participante      TEXT                       UNIQUE NOT NULL
    CONSTRAINT fmt_codigo CHECK (codigo_participante ~ '^(EXP|CTR)-[0-9]{3}$'),
  grupo                    public.grupo_estudio       NOT NULL,
  auth_user_id             UUID                       REFERENCES auth.users(id) ON DELETE SET NULL,
  estado                   public.estado_participante NOT NULL DEFAULT 'codigo_generado',
  fecha_generacion_codigo  TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  fecha_asignacion         TIMESTAMPTZ,
  fecha_consentimiento     TIMESTAMPTZ,
  fecha_inicio_estudio     TIMESTAMPTZ,
  fecha_retiro             TIMESTAMPTZ,
  motivo_retiro            TEXT,
  notas_investigador       TEXT,
  ultimo_login             TIMESTAMPTZ,
  creado_por               UUID                       NOT NULL
    REFERENCES public.usuarios_admin(id) ON DELETE RESTRICT,
  CONSTRAINT grupo_matches_prefijo CHECK (
    (codigo_participante LIKE 'EXP-%' AND grupo = 'experimental') OR
    (codigo_participante LIKE 'CTR-%' AND grupo = 'control')
  )
);

-- Trigger para set grupo automáticamente en INSERT
CREATE OR REPLACE FUNCTION public.set_grupo_from_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_participante LIKE 'EXP-%' THEN
    NEW.grupo := 'experimental';
  ELSE
    NEW.grupo := 'control';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_set_grupo ON public.participantes;
CREATE TRIGGER tg_set_grupo
  BEFORE INSERT ON public.participantes
  FOR EACH ROW EXECUTE FUNCTION public.set_grupo_from_codigo();

ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_participantes"
    ON public.participantes FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tutora_lee_participantes"
    ON public.participantes FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.usuarios_admin
      WHERE id = auth.uid() AND rol = 'tutora' AND activo = true
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "participante_lee_propio"
    ON public.participantes FOR SELECT
    USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_inserta_participantes"
    ON public.participantes FOR INSERT
    WITH CHECK (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_actualiza_participantes"
    ON public.participantes FOR UPDATE
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vista para el participante
CREATE OR REPLACE VIEW public.mi_participacion AS
SELECT
  id,
  codigo_participante,
  CASE grupo
    WHEN 'experimental' THEN 'A'
    WHEN 'control'      THEN 'B'
  END AS grupo_etiqueta,
  grupo AS grupo_interno,
  estado,
  fecha_inicio_estudio,
  fecha_retiro,
  motivo_retiro
FROM public.participantes
WHERE auth_user_id = auth.uid();

-- Función: validar y asociar código al usuario actual
CREATE OR REPLACE FUNCTION public.validar_codigo_participante(p_codigo TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id     UUID;
  v_estado public.estado_participante;
  v_uid    UUID;
BEGIN
  p_codigo := UPPER(TRIM(p_codigo));
  IF p_codigo !~ '^(EXP|CTR)-[0-9]{3}$' THEN
    RAISE EXCEPTION 'FORMATO_INVALIDO' USING ERRCODE = 'P0001';
  END IF;
  SELECT id, estado, auth_user_id INTO v_id, v_estado, v_uid
    FROM public.participantes WHERE codigo_participante = p_codigo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CODIGO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;
  IF v_estado <> 'codigo_generado' OR v_uid IS NOT NULL THEN
    RAISE EXCEPTION 'CODIGO_YA_USADO' USING ERRCODE = 'P0003';
  END IF;
  UPDATE public.participantes
    SET auth_user_id = auth.uid(), estado = 'codigo_asignado', fecha_asignacion = NOW()
    WHERE id = v_id;
  RETURN v_id;
END;
$$;

-- Función: recuperar sesión (re-asociar código a nuevo anon uid)
CREATE OR REPLACE FUNCTION public.recuperar_sesion_participante(p_codigo TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id     UUID;
  v_estado public.estado_participante;
BEGIN
  p_codigo := UPPER(TRIM(p_codigo));
  IF p_codigo !~ '^(EXP|CTR)-[0-9]{3}$' THEN
    RAISE EXCEPTION 'FORMATO_INVALIDO' USING ERRCODE = 'P0001';
  END IF;
  SELECT id, estado INTO v_id, v_estado
    FROM public.participantes WHERE codigo_participante = p_codigo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CODIGO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;
  IF v_estado = 'codigo_generado' THEN
    RAISE EXCEPTION 'CODIGO_NO_USADO_AUN' USING ERRCODE = 'P0004';
  END IF;
  IF v_estado = 'retirado' THEN
    RAISE EXCEPTION 'PARTICIPANTE_RETIRADO' USING ERRCODE = 'P0005';
  END IF;
  UPDATE public.participantes
    SET auth_user_id = auth.uid(), ultimo_login = NOW()
    WHERE id = v_id;
  RETURN v_id;
END;
$$;

-- Función: actualizar ultimo_login
CREATE OR REPLACE FUNCTION public.actualizar_ultimo_login()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.participantes
    SET ultimo_login = NOW()
    WHERE auth_user_id = auth.uid()
      AND estado NOT IN ('codigo_generado', 'retirado');
END;
$$;

-- Función: obtener email de contacto del investigador
CREATE OR REPLACE FUNCTION public.obtener_contacto_investigador()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.usuarios_admin
  WHERE rol = 'investigador' AND activo = true
  LIMIT 1;
$$;

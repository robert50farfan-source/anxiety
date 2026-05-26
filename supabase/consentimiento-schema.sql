-- =====================================================================
-- MÓDULO CONSENTIMIENTOS
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de participantes-schema.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.consentimientos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id   UUID        NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  version_documento TEXT        NOT NULL,
  fecha_aceptacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aceptado          BOOLEAN     NOT NULL,
  ip_hash           TEXT,
  user_agent        TEXT,
  texto_aceptado    TEXT        NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_consentimiento_version
  ON public.consentimientos(participante_id, version_documento)
  WHERE aceptado = true;

ALTER TABLE public.consentimientos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participante_lee_consentimiento"
    ON public.consentimientos FOR SELECT
    USING (participante_id IN (
      SELECT id FROM public.participantes WHERE auth_user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "participante_inserta_consentimiento"
    ON public.consentimientos FOR INSERT
    WITH CHECK (participante_id IN (
      SELECT id FROM public.participantes WHERE auth_user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "admin_lee_consentimientos"
    ON public.consentimientos FOR SELECT
    USING (public.es_admin_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Función SECURITY DEFINER: inserta consentimiento Y actualiza participantes
CREATE OR REPLACE FUNCTION public.registrar_consentimiento(
  p_version     TEXT,
  p_user_agent  TEXT,
  p_texto       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participante_id UUID;
  v_estado          public.estado_participante;
  v_consent_id      UUID;
BEGIN
  SELECT id, estado INTO v_participante_id, v_estado
    FROM public.participantes
   WHERE auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARTICIPANTE_NO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.consentimientos
    (participante_id, version_documento, aceptado, user_agent, texto_aceptado)
  VALUES
    (v_participante_id, p_version, true, p_user_agent, p_texto)
  RETURNING id INTO v_consent_id;

  -- Solo actualiza estado y fechas si viene de codigo_asignado
  -- (re-consentimiento por nueva versión no resetea fechas)
  IF v_estado = 'codigo_asignado' THEN
    UPDATE public.participantes
       SET estado               = 'consentimiento_firmado',
           fecha_consentimiento = NOW(),
           fecha_inicio_estudio = NOW()
     WHERE id = v_participante_id;
  END IF;

  RETURN v_consent_id;
END;
$$;

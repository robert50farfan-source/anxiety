-- =====================================================================
-- MÓDULO EPISODIOS DE ANSIEDAD
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de participantes-schema.sql
-- =====================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.intensidad_episodio AS ENUM ('leve', 'moderada', 'severa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_evento_episodio AS ENUM ('ansiedad', 'ataque_panico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contexto_episodio AS ENUM (
    'casa','aula','examen','laboratorio','transporte','social','trabajo','otro','no_especifica'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS public.episodios_ansiedad (
  id                      UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID                      NOT NULL,
  participante_id         UUID                      REFERENCES public.participantes(id) ON DELETE SET NULL,
  fecha_inicio            TIMESTAMPTZ               NOT NULL,
  duracion_minutos        INTEGER,
  en_curso                BOOLEAN                   NOT NULL DEFAULT false,
  intensidad              public.intensidad_episodio NOT NULL DEFAULT 'leve',
  intensidad_numerica     INTEGER                   NOT NULL DEFAULT 1 CHECK (intensidad_numerica BETWEEN 1 AND 10),
  tipo_evento             public.tipo_evento_episodio NOT NULL DEFAULT 'ansiedad',
  desencadenante          TEXT,
  contexto                public.contexto_episodio  NOT NULL DEFAULT 'no_especifica',
  contexto_otro           TEXT,
  sintomas_fisicos        TEXT[]                    NOT NULL DEFAULT '{}',
  sintomas_emocionales    TEXT[]                    NOT NULL DEFAULT '{}',
  estrategias_aplicadas   TEXT[]                    NOT NULL DEFAULT '{}',
  efectividad_estrategia  INTEGER                   CHECK (efectividad_estrategia BETWEEN 1 AND 5),
  notas                   TEXT,
  completado              BOOLEAN                   NOT NULL DEFAULT false,
  fecha_completado        TIMESTAMPTZ,
  paso_actual             INTEGER                   NOT NULL DEFAULT 1,
  fecha_creacion          TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_episodios_user      ON public.episodios_ansiedad (user_id);
CREATE INDEX IF NOT EXISTS idx_episodios_part      ON public.episodios_ansiedad (participante_id);
CREATE INDEX IF NOT EXISTS idx_episodios_fecha     ON public.episodios_ansiedad (fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_episodios_completado ON public.episodios_ansiedad (completado);

-- Trigger: set user_id y participante_id en INSERT
CREATE OR REPLACE FUNCTION public.preparar_episodio()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  SELECT id INTO NEW.participante_id
    FROM public.participantes WHERE auth_user_id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_preparar_episodio ON public.episodios_ansiedad;
CREATE TRIGGER tg_preparar_episodio
  BEFORE INSERT ON public.episodios_ansiedad
  FOR EACH ROW EXECUTE FUNCTION public.preparar_episodio();

-- RLS
ALTER TABLE public.episodios_ansiedad ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participante_lee_episodios_propios"
    ON public.episodios_ansiedad FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participante_inserta_episodio"
    ON public.episodios_ansiedad FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participante_actualiza_episodio"
    ON public.episodios_ansiedad FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "participante_borra_episodio"
    ON public.episodios_ansiedad FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_episodios"
    ON public.episodios_ansiedad FOR SELECT USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tutora_lee_episodios"
    ON public.episodios_ansiedad FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.usuarios_admin WHERE id = auth.uid() AND rol = 'tutora' AND activo = true
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Función alertas episodios para dashboard admin
CREATE OR REPLACE FUNCTION public.obtener_alertas_episodios()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_severos       JSONB;
  v_borradores    JSONB;
  v_tendencia     JSONB;
BEGIN
  -- Participantes con >=3 episodios severos últimos 7 días
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'codigo', p.codigo_participante, 'grupo', p.grupo, 'count', cnt
  )), '[]'::JSONB) INTO v_severos
  FROM (
    SELECT participante_id, COUNT(*) AS cnt
    FROM public.episodios_ansiedad
    WHERE intensidad = 'severa'
      AND fecha_inicio > NOW() - INTERVAL '7 days'
      AND completado = true
    GROUP BY participante_id
    HAVING COUNT(*) >= 3
  ) sub JOIN public.participantes p ON p.id = sub.participante_id;

  -- Borradores sin completar >7 días
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'codigo', p.codigo_participante, 'grupo', p.grupo,
    'dias', EXTRACT(DAY FROM NOW() - e.fecha_creacion)::INTEGER
  )), '[]'::JSONB) INTO v_borradores
  FROM public.episodios_ansiedad e
  JOIN public.participantes p ON p.id = e.participante_id
  WHERE e.completado = false
    AND e.fecha_creacion < NOW() - INTERVAL '7 days';

  -- Tendencia ascendente: promedio semanal episodios subió
  WITH semanas AS (
    SELECT participante_id,
           DATE_TRUNC('week', fecha_inicio) AS semana,
           COUNT(*) AS cnt
    FROM public.episodios_ansiedad
    WHERE completado = true AND fecha_inicio > NOW() - INTERVAL '4 weeks'
    GROUP BY participante_id, semana
  ),
  promedios AS (
    SELECT participante_id,
           AVG(CASE WHEN semana >= DATE_TRUNC('week', NOW()) - INTERVAL '2 weeks' THEN cnt END) AS reciente,
           AVG(CASE WHEN semana < DATE_TRUNC('week', NOW()) - INTERVAL '2 weeks' THEN cnt END) AS anterior
    FROM semanas GROUP BY participante_id
    HAVING AVG(CASE WHEN semana >= DATE_TRUNC('week', NOW()) - INTERVAL '2 weeks' THEN cnt END)
         > AVG(CASE WHEN semana < DATE_TRUNC('week', NOW()) - INTERVAL '2 weeks' THEN cnt END) + 0.5
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'codigo', p.codigo_participante, 'grupo', p.grupo,
    'reciente', pr.reciente, 'anterior', pr.anterior
  )), '[]'::JSONB) INTO v_tendencia
  FROM promedios pr JOIN public.participantes p ON p.id = pr.participante_id;

  RETURN jsonb_build_object(
    'severos_semana',     v_severos,
    'borradores_viejos',  v_borradores,
    'tendencia_frecuencia', v_tendencia
  );
END;
$$;

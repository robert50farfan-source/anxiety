-- =====================================================================
-- MÓDULO BAI — Tipificación de mediciones
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de participantes-schema.sql y consentimiento-schema.sql
-- =====================================================================

-- 1. Nuevo estado para participantes sin basal
ALTER TYPE public.estado_participante ADD VALUE IF NOT EXISTS 'inactivo_sin_basal';

-- 2. Enum de tipo de medición
DO $$ BEGIN
  CREATE TYPE public.tipo_medicion_bai AS ENUM
    ('basal', 'intermedia_4sem', 'final_8sem', 'seguimiento_12sem', 'voluntaria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Agregar columnas a resultados_bai
ALTER TABLE public.resultados_bai
  ADD COLUMN IF NOT EXISTS participante_id    UUID        REFERENCES public.participantes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_medicion      public.tipo_medicion_bai,
  ADD COLUMN IF NOT EXISTS dias_desde_inicio  INTEGER,
  ADD COLUMN IF NOT EXISTS ventana_esperada   BOOLEAN     NOT NULL DEFAULT false;

-- 4. RLS en resultados_bai
ALTER TABLE public.resultados_bai ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participante_lee_bai_propio"
    ON public.resultados_bai FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "participante_inserta_bai"
    ON public.resultados_bai FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_todos_bai"
    ON public.resultados_bai FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tutora_lee_todos_bai"
    ON public.resultados_bai FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.usuarios_admin
      WHERE id = auth.uid() AND rol = 'tutora' AND activo = true
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Trigger: auto-tipificar BAI al INSERT
CREATE OR REPLACE FUNCTION public.tipificar_bai_automatica()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_participante_id   UUID;
  v_fecha_inicio      TIMESTAMPTZ;
  v_dias              INTEGER;
  v_tipo              public.tipo_medicion_bai;
  v_ya_tiene_basal    BOOLEAN;
  v_ya_existe_tipo    BOOLEAN;
BEGIN
  SELECT id, fecha_inicio_estudio
    INTO v_participante_id, v_fecha_inicio
    FROM public.participantes
   WHERE auth_user_id = NEW.user_id;

  IF NOT FOUND OR v_fecha_inicio IS NULL THEN
    NEW.tipo_medicion    := 'voluntaria';
    NEW.ventana_esperada := false;
    RETURN NEW;
  END IF;

  NEW.participante_id   := v_participante_id;
  v_dias                := GREATEST(0, EXTRACT(DAY FROM (NEW.fecha - v_fecha_inicio))::INTEGER);
  NEW.dias_desde_inicio := v_dias;

  SELECT EXISTS(
    SELECT 1 FROM public.resultados_bai
    WHERE participante_id = v_participante_id AND tipo_medicion = 'basal'
  ) INTO v_ya_tiene_basal;

  -- Primer BAI siempre es basal (en cualquier día)
  IF NOT v_ya_tiene_basal THEN
    v_tipo               := 'basal';
    NEW.ventana_esperada := (v_dias <= 2);
  ELSIF v_dias BETWEEN 25 AND 35 THEN
    v_tipo := 'intermedia_4sem';
  ELSIF v_dias BETWEEN 53 AND 63 THEN
    v_tipo := 'final_8sem';
  ELSIF v_dias BETWEEN 81 AND 91 THEN
    v_tipo := 'seguimiento_12sem';
  ELSE
    v_tipo := 'voluntaria';
  END IF;

  -- Si el tipo programado ya existe, degradar a voluntaria
  IF v_tipo NOT IN ('voluntaria', 'basal') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.resultados_bai
      WHERE participante_id = v_participante_id AND tipo_medicion = v_tipo
    ) INTO v_ya_existe_tipo;
    IF v_ya_existe_tipo THEN
      v_tipo               := 'voluntaria';
      NEW.ventana_esperada := false;
    ELSE
      NEW.ventana_esperada := true;
    END IF;
  END IF;

  NEW.tipo_medicion := v_tipo;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_tipificar_bai ON public.resultados_bai;
CREATE TRIGGER tg_tipificar_bai
  BEFORE INSERT ON public.resultados_bai
  FOR EACH ROW EXECUTE FUNCTION public.tipificar_bai_automatica();

-- 6. Función para alertas del dashboard admin
CREATE OR REPLACE FUNCTION public.obtener_alertas_bai()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_basal_pendientes    JSONB;
  v_scores_graves       JSONB;
  v_ventana_incompleta  JSONB;
  v_tendencia           JSONB;
BEGIN
  -- 1. Basal pendiente > 2 días
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'codigo', p.codigo_participante, 'grupo', p.grupo,
    'dias', EXTRACT(DAY FROM NOW() - p.fecha_inicio_estudio)::INTEGER
  )), '[]'::JSONB) INTO v_basal_pendientes
  FROM public.participantes p
  WHERE p.estado IN ('consentimiento_firmado', 'activo')
    AND p.fecha_inicio_estudio IS NOT NULL
    AND NOW() - p.fecha_inicio_estudio > INTERVAL '2 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.resultados_bai b
      WHERE b.participante_id = p.id AND b.tipo_medicion = 'basal'
    );

  -- 2. Scores graves (>= 26) en últimas 2 semanas
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', p.id, 'codigo', p.codigo_participante, 'grupo', p.grupo,
    'puntaje', b.puntaje_total, 'fecha', b.fecha
  )), '[]'::JSONB) INTO v_scores_graves
  FROM public.resultados_bai b
  JOIN public.participantes p ON p.id = b.participante_id
  WHERE b.puntaje_total >= 26 AND b.fecha > NOW() - INTERVAL '14 days';

  -- 3. En ventana (mitad+) sin completar
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'codigo', p.codigo_participante, 'grupo', p.grupo,
    'tipo_pendiente', CASE
      WHEN EXTRACT(DAY FROM NOW()-p.fecha_inicio_estudio)::INTEGER BETWEEN 30 AND 35 THEN 'intermedia_4sem'
      WHEN EXTRACT(DAY FROM NOW()-p.fecha_inicio_estudio)::INTEGER BETWEEN 58 AND 63 THEN 'final_8sem'
      WHEN EXTRACT(DAY FROM NOW()-p.fecha_inicio_estudio)::INTEGER BETWEEN 86 AND 91 THEN 'seguimiento_12sem'
    END
  )), '[]'::JSONB) INTO v_ventana_incompleta
  FROM public.participantes p
  WHERE p.estado IN ('consentimiento_firmado', 'activo') AND p.fecha_inicio_estudio IS NOT NULL
    AND (
      (EXTRACT(DAY FROM NOW()-p.fecha_inicio_estudio)::INTEGER BETWEEN 30 AND 35
       AND NOT EXISTS (SELECT 1 FROM public.resultados_bai WHERE participante_id=p.id AND tipo_medicion='intermedia_4sem'))
      OR (EXTRACT(DAY FROM NOW()-p.fecha_inicio_estudio)::INTEGER BETWEEN 58 AND 63
       AND NOT EXISTS (SELECT 1 FROM public.resultados_bai WHERE participante_id=p.id AND tipo_medicion='final_8sem'))
      OR (EXTRACT(DAY FROM NOW()-p.fecha_inicio_estudio)::INTEGER BETWEEN 86 AND 91
       AND NOT EXISTS (SELECT 1 FROM public.resultados_bai WHERE participante_id=p.id AND tipo_medicion='seguimiento_12sem'))
    );

  -- 4. Tendencia ascendente (último - penúltimo > 5 puntos)
  WITH pares AS (
    SELECT b.participante_id,
           MAX(CASE WHEN rn = 1 THEN b.puntaje_total END) AS ultimo,
           MAX(CASE WHEN rn = 2 THEN b.puntaje_total END) AS penultimo
    FROM (
      SELECT participante_id, puntaje_total,
             ROW_NUMBER() OVER (PARTITION BY participante_id ORDER BY fecha DESC) AS rn
      FROM public.resultados_bai WHERE participante_id IS NOT NULL
    ) b WHERE rn <= 2
    GROUP BY participante_id
    HAVING MAX(CASE WHEN rn=1 THEN puntaje_total END) > MAX(CASE WHEN rn=2 THEN puntaje_total END) + 5
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'codigo', p.codigo_participante, 'grupo', p.grupo,
    'ultimo', pr.ultimo, 'penultimo', pr.penultimo
  )), '[]'::JSONB) INTO v_tendencia
  FROM pares pr JOIN public.participantes p ON p.id = pr.participante_id;

  RETURN jsonb_build_object(
    'basal_pendientes',     v_basal_pendientes,
    'scores_graves',        v_scores_graves,
    'ventana_incompleta',   v_ventana_incompleta,
    'tendencia_ascendente', v_tendencia
  );
END;
$$;

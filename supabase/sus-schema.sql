-- =====================================================================
-- MÓDULO SUS — Escala de Usabilidad del Sistema (Brooke, 1996)
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de swls-schema.sql
-- Se aplica una sola vez, en la ventana final_8sem (días 53–63)
-- =====================================================================

-- 1. Enum de tipo de medición
DO $$ BEGIN
  CREATE TYPE public.tipo_medicion_sus AS ENUM ('final_8sem', 'voluntaria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla de resultados
CREATE TABLE IF NOT EXISTS public.resultados_sus (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  participante_id    UUID        REFERENCES public.participantes(id) ON DELETE SET NULL,
  fecha              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_1             SMALLINT    NOT NULL CHECK (item_1  BETWEEN 1 AND 5),
  item_2             SMALLINT    NOT NULL CHECK (item_2  BETWEEN 1 AND 5),
  item_3             SMALLINT    NOT NULL CHECK (item_3  BETWEEN 1 AND 5),
  item_4             SMALLINT    NOT NULL CHECK (item_4  BETWEEN 1 AND 5),
  item_5             SMALLINT    NOT NULL CHECK (item_5  BETWEEN 1 AND 5),
  item_6             SMALLINT    NOT NULL CHECK (item_6  BETWEEN 1 AND 5),
  item_7             SMALLINT    NOT NULL CHECK (item_7  BETWEEN 1 AND 5),
  item_8             SMALLINT    NOT NULL CHECK (item_8  BETWEEN 1 AND 5),
  item_9             SMALLINT    NOT NULL CHECK (item_9  BETWEEN 1 AND 5),
  item_10            SMALLINT    NOT NULL CHECK (item_10 BETWEEN 1 AND 5),
  -- Ítems impares: respuesta − 1 · ítems pares: 5 − respuesta · suma × 2,5 → 0–100
  puntaje_total      NUMERIC(4,1) GENERATED ALWAYS AS (
    ((item_1 - 1) + (5 - item_2) + (item_3 - 1) + (5 - item_4) + (item_5 - 1) +
     (5 - item_6) + (item_7 - 1) + (5 - item_8) + (item_9 - 1) + (5 - item_10)) * 2.5
  ) STORED,
  tipo_medicion      public.tipo_medicion_sus,
  dias_desde_inicio  INTEGER,
  ventana_esperada   BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sus_user         ON public.resultados_sus (user_id);
CREATE INDEX IF NOT EXISTS idx_sus_participante ON public.resultados_sus (participante_id);

-- Máximo una SUS final_8sem por participante
CREATE UNIQUE INDEX IF NOT EXISTS uq_sus_tipo_programado
  ON public.resultados_sus (participante_id, tipo_medicion)
  WHERE tipo_medicion <> 'voluntaria' AND participante_id IS NOT NULL;

-- 3. RLS (mismas reglas que resultados_bai / resultados_swls)
ALTER TABLE public.resultados_sus ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participante_lee_sus_propio"
    ON public.resultados_sus FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "participante_inserta_sus"
    ON public.resultados_sus FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_todos_sus"
    ON public.resultados_sus FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tutora_lee_todos_sus"
    ON public.resultados_sus FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.usuarios_admin
      WHERE id = auth.uid() AND rol = 'tutora' AND activo = true
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Trigger: auto-tipificar SUS al INSERT
CREATE OR REPLACE FUNCTION public.tipificar_sus_automatica()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_participante_id   UUID;
  v_fecha_inicio      TIMESTAMPTZ;
  v_dias              INTEGER;
  v_ya_existe         BOOLEAN;
BEGIN
  -- La fecha la fija el servidor: el cliente no puede adelantarla para cambiar la ventana
  NEW.fecha := NOW();

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
    SELECT 1 FROM public.resultados_sus
    WHERE participante_id = v_participante_id AND tipo_medicion = 'final_8sem'
  ) INTO v_ya_existe;

  IF v_dias BETWEEN 53 AND 63 AND NOT v_ya_existe THEN
    NEW.tipo_medicion    := 'final_8sem';
    NEW.ventana_esperada := true;
  ELSE
    NEW.tipo_medicion    := 'voluntaria';
    NEW.ventana_esperada := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_tipificar_sus ON public.resultados_sus;
CREATE TRIGGER tg_tipificar_sus
  BEFORE INSERT ON public.resultados_sus
  FOR EACH ROW EXECUTE FUNCTION public.tipificar_sus_automatica();

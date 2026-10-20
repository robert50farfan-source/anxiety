-- =====================================================================
-- MÓDULO SWLS — Escala de Satisfacción con la Vida (Diener et al., 1985)
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de bai-schema.sql
-- =====================================================================

-- 1. Enum de tipo de medición (sin intermedia_4sem: la SWLS no se aplica en semana 4)
DO $$ BEGIN
  CREATE TYPE public.tipo_medicion_swls AS ENUM
    ('basal', 'final_8sem', 'seguimiento_12sem', 'voluntaria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla de resultados
CREATE TABLE IF NOT EXISTS public.resultados_swls (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  participante_id    UUID        REFERENCES public.participantes(id) ON DELETE SET NULL,
  fecha              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_1             SMALLINT    NOT NULL CHECK (item_1 BETWEEN 1 AND 7),
  item_2             SMALLINT    NOT NULL CHECK (item_2 BETWEEN 1 AND 7),
  item_3             SMALLINT    NOT NULL CHECK (item_3 BETWEEN 1 AND 7),
  item_4             SMALLINT    NOT NULL CHECK (item_4 BETWEEN 1 AND 7),
  item_5             SMALLINT    NOT NULL CHECK (item_5 BETWEEN 1 AND 7),
  puntaje_total      SMALLINT    GENERATED ALWAYS AS (item_1 + item_2 + item_3 + item_4 + item_5) STORED,
  tipo_medicion      public.tipo_medicion_swls,
  dias_desde_inicio  INTEGER,
  ventana_esperada   BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_swls_user         ON public.resultados_swls (user_id);
CREATE INDEX IF NOT EXISTS idx_swls_participante ON public.resultados_swls (participante_id);

-- Máximo una medición por tipo programado (el trigger degrada duplicados a
-- voluntaria; el índice protege ante envíos simultáneos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_swls_tipo_programado
  ON public.resultados_swls (participante_id, tipo_medicion)
  WHERE tipo_medicion <> 'voluntaria' AND participante_id IS NOT NULL;

-- 3. RLS (mismas reglas que resultados_bai)
ALTER TABLE public.resultados_swls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "participante_lee_swls_propio"
    ON public.resultados_swls FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "participante_inserta_swls"
    ON public.resultados_swls FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investigador_lee_todos_swls"
    ON public.resultados_swls FOR SELECT
    USING (public.es_investigador_activo());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tutora_lee_todos_swls"
    ON public.resultados_swls FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.usuarios_admin
      WHERE id = auth.uid() AND rol = 'tutora' AND activo = true
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Trigger: auto-tipificar SWLS al INSERT (mismas ventanas que el BAI)
CREATE OR REPLACE FUNCTION public.tipificar_swls_automatica()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_participante_id   UUID;
  v_fecha_inicio      TIMESTAMPTZ;
  v_dias              INTEGER;
  v_tipo              public.tipo_medicion_swls;
  v_ya_tiene_basal    BOOLEAN;
  v_ya_existe_tipo    BOOLEAN;
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
    SELECT 1 FROM public.resultados_swls
    WHERE participante_id = v_participante_id AND tipo_medicion = 'basal'
  ) INTO v_ya_tiene_basal;

  -- Primera SWLS siempre es basal (en cualquier día), igual que el BAI
  IF NOT v_ya_tiene_basal THEN
    v_tipo               := 'basal';
    NEW.ventana_esperada := (v_dias <= 2);
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
      SELECT 1 FROM public.resultados_swls
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

DROP TRIGGER IF EXISTS tg_tipificar_swls ON public.resultados_swls;
CREATE TRIGGER tg_tipificar_swls
  BEFORE INSERT ON public.resultados_swls
  FOR EACH ROW EXECUTE FUNCTION public.tipificar_swls_automatica();

-- =====================================================================
-- MÓDULO CRISIS — registro de notificaciones por email
-- Idempotente: se puede re-ejecutar sin errores
-- Ejecutar DESPUÉS de profesionales-crisis-schema.sql
--
-- Permite limitar los correos de "crisis detectada en el chat" a uno cada
-- 30 minutos por participante sin dejar de registrar cada evento.
-- =====================================================================

ALTER TABLE public.eventos_crisis
  ADD COLUMN IF NOT EXISTS notificado_email BOOLEAN NOT NULL DEFAULT false;

-- Consulta del límite: último email por participante y tipo
CREATE INDEX IF NOT EXISTS idx_eventos_crisis_notificados
  ON public.eventos_crisis (user_id, tipo_evento, timestamp DESC)
  WHERE notificado_email;

-- El participante inserta sus eventos pero no puede marcarlos como notificados:
-- solo la Edge Function (service role) actualiza esta columna.
REVOKE UPDATE (notificado_email) ON public.eventos_crisis FROM anon, authenticated;

-- ==============================================================================
-- ACTUALIZACIÓN DE BASE DE DATOS SUPABASE / POSTGRESQL - TP PAGOS
-- Incorporación de 5 Rubros de Servicio, Banco de Origen, Lista de Acompañantes,
-- Sistema de Aprobación de Modificaciones por Administrador y Realtime
-- ==============================================================================

-- 1. Asegurar que las columnas existan en la tabla payment_requests
ALTER TABLE public.payment_requests 
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'hospedaje',
  ADD COLUMN IF NOT EXISTS origin_bank TEXT,
  ADD COLUMN IF NOT EXISTS airline TEXT,
  ADD COLUMN IF NOT EXISTS flight_route TEXT,
  ADD COLUMN IF NOT EXISTS guest_list JSONB,
  ADD COLUMN IF NOT EXISTS modification_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS modification_reason TEXT,
  ADD COLUMN IF NOT EXISTS modification_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS modification_requested_by TEXT;

-- 2. Asegurar índices para rendimiento de consultas móviles y filtros
CREATE INDEX IF NOT EXISTS idx_payment_requests_category ON public.payment_requests(category);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON public.payment_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_mod_req ON public.payment_requests(modification_requested);

-- 3. Habilitar la réplica completa y la publicación Realtime para sincronización instantánea
ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payment_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
  END IF;
END $$;

-- 4. Actualizar políticas de seguridad (RLS) para permitir SELECT, INSERT, UPDATE y DELETE
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir select universal en payment_requests" ON public.payment_requests;
CREATE POLICY "Permitir select universal en payment_requests"
  ON public.payment_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert universal en payment_requests" ON public.payment_requests;
CREATE POLICY "Permitir insert universal en payment_requests"
  ON public.payment_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update universal en payment_requests" ON public.payment_requests;
CREATE POLICY "Permitir update universal en payment_requests"
  ON public.payment_requests FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete universal en payment_requests" ON public.payment_requests;
CREATE POLICY "Permitir delete universal en payment_requests"
  ON public.payment_requests FOR DELETE
  USING (true);

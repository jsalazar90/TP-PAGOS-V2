-- ==============================================================================
-- TABLA DE TASAS JT DIARIAS PARA EL CONTROL DE DIFERENCIAL CAMBIARIO
-- TP PAGOS PRO - Control y Gestión de Pagos
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.jt_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL UNIQUE,
  rate NUMERIC(14, 4) NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice optimizado por fecha de tasa
CREATE INDEX IF NOT EXISTS idx_jt_rates_date ON public.jt_rates(rate_date DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.jt_rates ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura públicas o para autenticados
DROP POLICY IF EXISTS "Permitir lectura general de tasas JT" ON public.jt_rates;
CREATE POLICY "Permitir lectura general de tasas JT"
ON public.jt_rates FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion de tasas JT" ON public.jt_rates;
CREATE POLICY "Permitir insercion y actualizacion de tasas JT"
ON public.jt_rates FOR ALL
USING (true)
WITH CHECK (true);

-- Notificar a PostgREST para recargar la caché del esquema de Supabase inmediatamente
NOTIFY pgrst, 'reload schema';

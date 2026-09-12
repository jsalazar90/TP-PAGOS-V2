-- ==============================================================================
-- AGREGAR COLUMNAS DEDICADAS DE RESTAURACIÓN Y MODIFICACIÓN
-- TP PAGOS PRO - Control y Gestión de Pagos
-- ==============================================================================

-- 1. Agregar columnas para trazabilidad de Restauración de solicitudes
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS restored_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS restored_by_name TEXT,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS restored_reason TEXT;

-- 2. Agregar columnas para trazabilidad de Modificaciones
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_modified_by_name TEXT,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- 3. Crear índices para optimizar consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_payment_requests_restored_at 
ON public.payment_requests(restored_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_last_modified_at 
ON public.payment_requests(last_modified_at DESC);

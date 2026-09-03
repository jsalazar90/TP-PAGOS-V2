-- ==============================================================================
-- AGREGAR COLUMNA DEDICADA DE FECHA DE LIQUIDACIÓN (PAID_AT)
-- TP PAGOS PRO - Control y Gestión de Pagos
-- ==============================================================================

-- 1. Agregar columna paid_at si no existe
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Crear índice para optimizar reportes contables e historial por fecha de liquidación
CREATE INDEX IF NOT EXISTS idx_payment_requests_paid_at 
ON public.payment_requests(paid_at DESC);

-- 3. Actualizar solicitudes existentes que ya están en estado 'realizado'
-- Se recupera la fecha real en orden de prioridad:
--  a) La fecha de subida del primer comprobante (receipt_files[0].uploaded_at)
--  b) La fecha de creación original del registro (created_at)
UPDATE public.payment_requests
SET paid_at = COALESCE(
  CASE 
    WHEN receipt_files IS NOT NULL 
     AND jsonb_typeof(receipt_files) = 'array' 
     AND jsonb_array_length(receipt_files) > 0 
     AND (receipt_files->0->>'uploaded_at') IS NOT NULL
    THEN (receipt_files->0->>'uploaded_at')::timestamptz
    ELSE NULL
  END,
  created_at
)
WHERE status = 'realizado' 
  AND paid_at IS NULL;

-- 4. Verificación de registros actualizados
SELECT 
  id, 
  locator, 
  title, 
  client, 
  status, 
  paid_at, 
  created_at, 
  updated_at
FROM public.payment_requests
WHERE status = 'realizado'
ORDER BY paid_at DESC
LIMIT 20;

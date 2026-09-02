-- ==============================================================================
-- SCRIPT SQL: SOPORTE DE MÚLTIPLES COMPROBANTES Y SOPORTES DE PAGO
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Agregar columna JSONB para múltiples comprobantes de liquidación si no existe
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS receipt_files JSONB DEFAULT '[]'::jsonb;

-- 2. Agregar columna JSONB para múltiples soportes/facturas de reserva si no existe
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS support_files JSONB DEFAULT '[]'::jsonb;

-- 3. Comentarios informativos
COMMENT ON COLUMN public.payment_requests.receipt_files IS 'Arreglo JSONB con todas las transferencias o capturas de pago adjuntas';
COMMENT ON COLUMN public.payment_requests.support_files IS 'Arreglo JSONB con todas las facturas o soportes adjuntos';

-- 4. Actualizar las filas existentes para sincronizar con receipt_file_url
UPDATE public.payment_requests
SET receipt_files = jsonb_build_array(
  jsonb_build_object(
    'url', receipt_file_url,
    'fileName', COALESCE(receipt_file_name, 'Comprobante de Pago'),
    'uploaded_at', COALESCE(updated_at, created_at)
  )
)
WHERE receipt_file_url IS NOT NULL 
  AND (receipt_files IS NULL OR jsonb_array_length(receipt_files) = 0);

UPDATE public.payment_requests
SET support_files = jsonb_build_array(
  jsonb_build_object(
    'url', support_file_url,
    'fileName', COALESCE(support_file_name, 'Soporte de Reserva'),
    'uploaded_at', created_at
  )
)
WHERE support_file_url IS NOT NULL 
  AND (support_files IS NULL OR jsonb_array_length(support_files) = 0);

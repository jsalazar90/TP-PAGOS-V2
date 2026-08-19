-- ==============================================================================
-- JT PAGOS - MIGRACIÓN PARA VUELOS Y MULTI-HUÉSPEDES EN SUPABASE
-- Ejecutar este script en el Editor SQL de tu panel Supabase (SQL Editor)
-- ==============================================================================

-- 1. Agregar columna para Aerolínea
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS airline TEXT;

-- 2. Agregar columna para Ruta de Vuelo
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS flight_route TEXT;

-- 3. Agregar columna para Lista de Pasajeros / Huéspedes (JSONB)
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS guest_list JSONB;

-- 4. Agregar columna para Contraseña de Usuarios en Perfiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '1234';

-- 5. Notificar a PostgREST para refrescar la caché del esquema
NOTIFY pgrst, 'reload schema';

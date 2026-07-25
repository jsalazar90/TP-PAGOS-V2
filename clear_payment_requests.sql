-- ==============================================================================
-- JT PAGOS - SCRIPT PARA LIMPIAR ÚNICAMENTE LAS SOLICITUDES DE PAGO EN SUPABASE
-- (Conserva intactos los usuarios y perfiles en la tabla public.profiles)
-- ==============================================================================

-- 1. Eliminar todas las solicitudes de pago y reiniciar el correlativo de numeración (request_number)
TRUNCATE TABLE public.payment_requests RESTART IDENTITY CASCADE;

-- 2. Mensaje de confirmación
SELECT 'Base de datos de solicitudes limpiada con éxito. Usuarios y perfiles conservados.' AS resultado;

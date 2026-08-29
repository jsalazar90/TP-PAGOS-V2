-- ==============================================================================
-- ACTUALIZACIÓN DE BASE DE DATOS SUPABASE / POSTGRESQL - TP PAGOS PRO
-- Incorporación del nuevo rol 'operador' (Visibilidad restringida)
-- ==============================================================================

-- Ejecuta esta instrucción en el SQL Editor de tu proyecto Supabase:
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operador';

-- Asegurar que los perfiles y bitácora mantengan su integridad
COMMENT ON TYPE user_role IS 'Roles: admin (acceso total), solicitante (operaciones/reservas) y operador (solo sus solicitudes y pagos)';

-- ==============================================================================
-- SCRIPT DE CORRECCIÓN: SOLICITUDES CON MONTO USD EN 0 Y MONTO BS > 0 CON TASA
-- ==============================================================================
-- Este script calcula y actualiza automáticamente el campo amount_usd = (amount_bs / bcv_rate)
-- para todas las solicitudes registradas donde amount_usd sea 0 o nulo y tengan Bs y Tasa.

UPDATE payment_requests
SET amount_usd = ROUND((amount_bs / bcv_rate)::numeric, 2)
WHERE (amount_usd IS NULL OR amount_usd <= 0)
  AND amount_bs > 0
  AND bcv_rate > 0;

-- Verificación de registros corregidos
SELECT 
  id, 
  locator, 
  title, 
  client, 
  amount_usd, 
  bcv_rate, 
  amount_bs, 
  status, 
  created_at
FROM payment_requests
WHERE amount_bs > 0 AND bcv_rate > 0
ORDER BY created_at DESC;

-- ==============================================================================
-- JT PAGOS - MIGRACIÓN PARA BANCO DE ORIGEN Y SINCRONIZACIÓN EN VIVO (REALTIME)
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- ==============================================================================

-- 1. Agregar columna para Banco de Origen (Emisor del pago)
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS origin_bank TEXT;

-- 2. Asegurar columnas de soporte y vuelos
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS airline TEXT;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS flight_route TEXT;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS guest_list JSONB;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '1234';

-- 3. Habilitar Replicación en Tiempo Real (Realtime) para payment_requests
-- (Esto permite que los cambios de inserción, actualización y borrado se transmitan
-- inmediatamente a todos los dispositivos web, móviles y de escritorio)
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
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- 4. Asegurar política de eliminación para DELETE en payment_requests
DROP POLICY IF EXISTS "Todos los usuarios pueden eliminar solicitudes" ON public.payment_requests;
CREATE POLICY "Todos los usuarios pueden eliminar solicitudes"
  ON public.payment_requests FOR DELETE
  USING (true);

-- 5. Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- JT PAGOS - CREACIÓN Y VINCULACIÓN DE TABLA DE BENEFICIARIOS
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- ==============================================================================

-- 1. Crear tabla de beneficiarios si no existe
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rif TEXT,
  category TEXT DEFAULT 'hospedaje',
  bank_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Asegurar que las columnas existan en caso de que la tabla ya hubiera sido creada previamente
ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS rif TEXT;

ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'hospedaje';

ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Habilitar Seguridad por Filas (Row Level Security - RLS)
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- 4. Crear Políticas de Acceso Completo (Lectura, Inserción, Actualización y Eliminación)
DROP POLICY IF EXISTS "Permitir lectura publica de beneficiarios" ON public.beneficiaries;
CREATE POLICY "Permitir lectura publica de beneficiarios"
  ON public.beneficiaries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insercion de beneficiarios" ON public.beneficiaries;
CREATE POLICY "Permitir insercion de beneficiarios"
  ON public.beneficiaries FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de beneficiarios" ON public.beneficiaries;
CREATE POLICY "Permitir actualizacion de beneficiarios"
  ON public.beneficiaries FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion de beneficiarios" ON public.beneficiaries;
CREATE POLICY "Permitir eliminacion de beneficiarios"
  ON public.beneficiaries FOR DELETE
  USING (true);

-- 5. Habilitar Replicación en Tiempo Real (Realtime) para la tabla de beneficiarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'beneficiaries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiaries;
  END IF;
END $$;

-- 6. Insertar Beneficiarios Iniciales de Muestra (si no existen)
INSERT INTO public.beneficiaries (id, name, rif, category, bank_details, created_at, updated_at)
VALUES 
  (
    'ben-001',
    'INVERSIONES HOTEL KARIÑA C.A.',
    'J-30981234-5',
    'hospedaje',
    '{
      "payment_method": "transferencia_bs",
      "beneficiary": "INVERSIONES HOTEL KARIÑA C.A.",
      "rif": "J-30981234-5",
      "bank": "BANESCO",
      "account_number": "01340034120341098234",
      "account_type": "Corriente"
    }'::jsonb,
    now(),
    now()
  ),
  (
    'ben-002',
    'HOTELERA EUROBUILDING PZO C.A.',
    'J-00293841-2',
    'hospedaje',
    '{
      "payment_method": "transferencia_bs",
      "beneficiary": "HOTELERA EUROBUILDING PZO C.A.",
      "rif": "J-00293841-2",
      "bank": "BANCO MERCANTIL",
      "account_number": "01050012991051239845",
      "account_type": "Corriente"
    }'::jsonb,
    now(),
    now()
  ),
  (
    'ben-003',
    'TRANSPORTE EJECUTIVO VIP C.A.',
    'J-40912837-4',
    'traslado',
    '{
      "payment_method": "pago_movil",
      "beneficiary": "TRANSPORTE EJECUTIVO VIP",
      "rif": "J-40912837-4",
      "bank": "BANESCO",
      "pago_movil_phone": "04129876543",
      "pago_movil_ci": "J-409128374"
    }'::jsonb,
    now(),
    now()
  ),
  (
    'ben-004',
    'LINEA AEREA LASER AIRLINES C.A.',
    'J-30129834-0',
    'vuelos',
    '{
      "payment_method": "transferencia_bs",
      "beneficiary": "LINEA AEREA LASER AIRLINES C.A.",
      "rif": "J-30129834-0",
      "bank": "BANCO PROVINCIAL",
      "account_number": "01080014230100982341",
      "account_type": "Corriente"
    }'::jsonb,
    now(),
    now()
  ),
  (
    'ben-005',
    'SERVICIOS TURISTICOS ZELLE USD',
    'V-19823412',
    'hospedaje',
    '{
      "payment_method": "zelle_usd",
      "beneficiary": "SERVICIOS TURISTICOS INTERNACIONALES",
      "zelle_email": "pagos.serviciosturisticos@gmail.com",
      "zelle_name": "SERVICIOS TURISTICOS C.A."
    }'::jsonb,
    now(),
    now()
  ),
  (
    'ben-006',
    'LOGISTICA & PROVEEDORES BINANCE PAY',
    'V-20194823',
    'gastos_apoyo',
    '{
      "payment_method": "binance",
      "beneficiary": "LOGISTICA DE CAMPO OPERACIONES",
      "binance_email": "logistica.campo.ve@gmail.com",
      "binance_pay_id": "582910482"
    }'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rif = EXCLUDED.rif,
  category = EXCLUDED.category,
  bank_details = EXCLUDED.bank_details,
  updated_at = now();

-- 7. Notificar a PostgREST para recargar el esquema inmediatamente
NOTIFY pgrst, 'reload schema';

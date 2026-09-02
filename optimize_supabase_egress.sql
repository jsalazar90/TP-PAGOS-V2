-- =====================================================================
-- OPTIMIZACIÓN Y PROTECCIÓN DE BASE DE DATOS SUPABASE (TP PAGOS)
-- =====================================================================

-- 1. Índices de alta velocidad para acelerar consultas y reducir consumo de CPU / I/O
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at 
  ON public.payment_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status 
  ON public.payment_requests(status);

CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by 
  ON public.payment_requests(created_by);

CREATE INDEX IF NOT EXISTS idx_payment_requests_locator 
  ON public.payment_requests(locator);

CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON public.profiles(username);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_name 
  ON public.beneficiaries(name);

-- 2. Asegurar que el Bucket de Almacenamiento 'payment-supports' sea público
-- (Esto garantiza que las imágenes y PDFs se guarden como archivos en Storage y no como texto pesado en la base de datos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-supports', 'payment-supports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de Storage para lectura y subida de comprobantes sin errores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public uploads to payment-supports'
  ) THEN
    CREATE POLICY "Allow public uploads to payment-supports" 
      ON storage.objects FOR INSERT 
      WITH CHECK (bucket_id = 'payment-supports');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public reads from payment-supports'
  ) THEN
    CREATE POLICY "Allow public reads from payment-supports" 
      ON storage.objects FOR SELECT 
      USING (bucket_id = 'payment-supports');
  END IF;
END $$;

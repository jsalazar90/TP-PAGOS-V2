-- ==============================================================================
-- JT PAGOS - SCRIPT DE BASE DE DATOS POSTGRESQL / SUPABASE
-- Sistema Administrativo de Control y Gestión de Pagos (Mobile-First)
-- ==============================================================================

-- 1. CREACIÓN DE TIPOS ENUM (ROLES Y ESTADOS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'solicitante');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('px_fondos', 'en_proceso', 'urgente', 'realizado');
  END IF;
END $$;

-- 2. TABLA DE PERFILES DE USUARIO (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'solicitante',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la tabla ya existía con Foreign Key a auth.users, la eliminamos para permitir usuarios autónomos
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. TABLA DE SOLICITUDES DE PAGO (PAYMENT_REQUESTS)
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number SERIAL,
  category TEXT NOT NULL DEFAULT 'hospedaje', -- 'hospedaje', 'traslado', 'gastos_apoyo'
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_ci TEXT NOT NULL,
  locator TEXT NOT NULL,
  location TEXT NOT NULL,
  room_type TEXT NOT NULL,
  people_count INT NOT NULL DEFAULT 1,
  additionals TEXT,
  nights_dates TEXT NOT NULL,
  route_from_to TEXT,
  expense_concept TEXT,
  currency TEXT NOT NULL DEFAULT 'VES', -- 'VES' o 'USD'
  amount_usd NUMERIC(12, 2) NOT NULL,
  bcv_rate NUMERIC(12, 4) NOT NULL DEFAULT 0,
  amount_bs NUMERIC(14, 2) DEFAULT 0,
  bank_details JSONB NOT NULL,
  status request_status NOT NULL DEFAULT 'en_proceso',
  support_file_url TEXT,
  support_file_name TEXT,
  receipt_file_url TEXT,
  receipt_file_name TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ÍNDICES PARA BÚSQUEDAS RÁPIDAS Y RENDIMIENTO MÓVIL
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_category ON public.payment_requests(category);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by ON public.payment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_locator ON public.payment_requests(locator);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON public.payment_requests(created_at DESC);

-- 5. TRIGGER AUTOMÁTICO PARA ACTUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payment_requests_updated_at ON public.payment_requests;
CREATE TRIGGER set_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY ABIERTAS PARA ACCESO CON ANON KEY)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DROP POLICY IF EXISTS "Admins pueden ver y editar todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir crear perfiles a usuarios autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizar perfiles a usuarios autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Todos los usuarios pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Todos los usuarios pueden crear perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Todos los usuarios pueden actualizar perfiles" ON public.profiles;

DROP POLICY IF EXISTS "Admins tienen acceso total a las solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Solicitantes ven solo las solicitudes creadas por ellos" ON public.payment_requests;
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver todas las solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Solicitantes pueden crear nuevas solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Todos los usuarios pueden ver solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Todos los usuarios pueden crear solicitudes" ON public.payment_requests;
DROP POLICY IF EXISTS "Todos los usuarios pueden actualizar solicitudes" ON public.payment_requests;

-- Políticas universales (Permiten operaciones con la anon key configurada en la aplicación)
CREATE POLICY "Todos los usuarios pueden ver perfiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Todos los usuarios pueden crear perfiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Todos los usuarios pueden actualizar perfiles"
  ON public.profiles FOR UPDATE
  USING (true);

CREATE POLICY "Todos los usuarios pueden ver solicitudes"
  ON public.payment_requests FOR SELECT
  USING (true);

CREATE POLICY "Todos los usuarios pueden crear solicitudes"
  ON public.payment_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Todos los usuarios pueden actualizar solicitudes"
  ON public.payment_requests FOR UPDATE
  USING (true);

-- 7. CONFIGURACIÓN DE BUCKET DE ALMACENAMIENTO (SUPABASE STORAGE)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-supports', 'payment-supports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas para Storage Bucket (Permiten subir y ver archivos con anon key)
DROP POLICY IF EXISTS "Permitir ver archivos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subir archivos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir ver archivos publicos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subir archivos publicos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizar archivos publicos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir ver archivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subir archivos" ON storage.objects;

CREATE POLICY "Permitir ver archivos publicos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-supports');

CREATE POLICY "Permitir subir archivos publicos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'payment-supports');

CREATE POLICY "Permitir actualizar archivos publicos"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'payment-supports');

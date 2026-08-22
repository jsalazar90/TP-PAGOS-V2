-- ==============================================================================
-- TABLA DE SUSCRIPCIONES PUSH WEB PARA NOTIFICACIONES EN SEGUNDO PLANO (ANDROID / PWA)
-- TP PAGOS PRO - Travel Point
-- ==============================================================================

-- 1. Crear tabla de suscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL DEFAULT 'admin',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON public.push_subscriptions(user_role);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso para el cliente
DROP POLICY IF EXISTS "Permitir lectura de suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Permitir lectura de suscripciones push"
  ON public.push_subscriptions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion de suscripciones" ON public.push_subscriptions;
CREATE POLICY "Permitir insercion y actualizacion de suscripciones"
  ON public.push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_push_sub_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_sub_updated_at();

-- ==============================================================================
-- CONFIGURACIÓN DEL WEBHOOK DE SUPABASE:
-- ==============================================================================
-- En el panel de Supabase:
-- 1. Ve a Database -> Webhooks -> "Create a new webhook"
-- 2. Name: notify_admins_push
-- 3. Table: payment_requests
-- 4. Events: Insert, Update
-- 5. Type: Supabase Edge Functions -> send-push
-- ==============================================================================

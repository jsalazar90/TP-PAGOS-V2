-- ==============================================================================
-- TABLA DE SUSCRIPCIONES PUSH WEB PARA NOTIFICACIONES EN SEGUNDO PLANO (ANDROID / PWA)
-- TP PAGOS PRO - Travel Point
-- ==============================================================================

-- 1. Eliminar tabla previa para limpiar constraints conflictivas
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

-- 2. Crear tabla de suscripciones push
CREATE TABLE public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  user_role TEXT NOT NULL DEFAULT 'admin',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON public.push_subscriptions(user_role);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de acceso para el cliente
CREATE POLICY "Permitir lectura de suscripciones push"
  ON public.push_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Permitir insercion y actualizacion de suscripciones"
  ON public.push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Trigger para actualizar updated_at automáticamente
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

-- ==============================================================================
-- TABLA DE BITÁCORA Y AUDITORÍA DE MOVIMIENTOS (AUDIT LOGS)
-- TP PAGOS PRO - Módulo de Auditoría y Seguridad (/auditor)
-- ==============================================================================

-- 1. Crear tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, 
  -- Ej: 'create_request', 'request_modification', 'cancel_modification',
  --     'update_request', 'status_change', 'delete_request', 
  --     'create_beneficiary', 'update_beneficiary', 'delete_beneficiary',
  --     'create_user', 'change_password', 'toggle_user_status', 'login'
  
  user_id TEXT,
  username TEXT NOT NULL,
  user_role TEXT NOT NULL,
  
  target_id TEXT,
  target_title TEXT,
  
  details TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices de optimización para consultas y filtros rápidos
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_username ON public.audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_target_id ON public.audit_logs(target_id);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso abiertas para el sistema
CREATE POLICY "Permitir insercion de logs de auditoria"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir lectura de logs de auditoria"
  ON public.audit_logs FOR SELECT
  USING (true);

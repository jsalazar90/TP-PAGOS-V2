// ==============================================================================
// SERVICIO DE AUDITORÍA Y BITÁCORA DE MOVIMIENTOS
// TP PAGOS PRO - Sub-página /auditor
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile } from '../types';

export type AuditActionType =
  | 'create_request'
  | 'request_modification'
  | 'cancel_modification'
  | 'request_cancellation'
  | 'cancel_cancellation'
  | 'update_request'
  | 'status_change'
  | 'delete_request'
  | 'create_beneficiary'
  | 'update_beneficiary'
  | 'delete_beneficiary'
  | 'create_user'
  | 'change_password'
  | 'toggle_user_status'
  | 'login';

export interface AuditLogEntry {
  id: string;
  action_type: AuditActionType;
  user_id?: string;
  username: string;
  user_role: string;
  target_id?: string;
  target_title?: string;
  details: string;
  metadata?: Record<string, any>;
  user_agent?: string;
  created_at: string;
}

const AUDIT_STORAGE_KEY = 'jt_pagos_audit_logs_v1';

function getLocalAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalAuditLogs(logs: AuditLogEntry[]) {
  try {
    // Guardar hasta los últimos 1000 registros localmente
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 1000)));
  } catch (e) {
    console.warn('Error saving local audit logs:', e);
  }
}

// Registrar evento en la bitácora
export async function logAuditEvent(entry: {
  action_type: AuditActionType;
  user?: UserProfile | null;
  username?: string;
  user_role?: string;
  target_id?: string;
  target_title?: string;
  details: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const newLog: AuditLogEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    action_type: entry.action_type,
    user_id: entry.user?.id || undefined,
    username: entry.username || entry.user?.full_name || entry.user?.username || 'Sistema',
    user_role: entry.user_role || entry.user?.role || 'desconocido',
    target_id: entry.target_id,
    target_title: entry.target_title,
    details: entry.details,
    metadata: entry.metadata || {},
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    created_at: new Date().toISOString()
  };

  // 1. Guardar localmente
  const local = getLocalAuditLogs();
  setLocalAuditLogs([newLog, ...local]);

  // 2. Guardar en Supabase si está disponible
  if (isSupabaseConfigured && supabase) {
    try {
      const isValidUUID = (str?: string) =>
        str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str) : false;

      const payload: any = {
        action_type: newLog.action_type,
        username: newLog.username,
        user_role: newLog.user_role,
        target_id: newLog.target_id,
        target_title: newLog.target_title,
        details: newLog.details,
        metadata: newLog.metadata,
        user_agent: newLog.user_agent,
        created_at: newLog.created_at
      };

      if (isValidUUID(newLog.id)) {
        payload.id = newLog.id;
      }
      if (isValidUUID(newLog.user_id)) {
        payload.user_id = newLog.user_id;
      }

      const { error } = await supabase.from('audit_logs').insert([payload]);
      if (error) {
        console.warn('Supabase audit log insert notice:', error.message);
      }
    } catch (e) {
      console.warn('Could not insert audit log to Supabase, saved locally:', e);
    }
  }
}

// Consultar lista completa de la bitácora
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const local = getLocalAuditLogs();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data && data.length > 0) {
        // Fusionar con registros locales por si hubo desconexión
        const map = new Map<string, AuditLogEntry>();
        data.forEach((item: any) => map.set(item.id, item));
        local.forEach((item: AuditLogEntry) => {
          if (!map.has(item.id)) map.set(item.id, item);
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLocalAuditLogs(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Error fetching audit logs from Supabase, using local:', e);
    }
  }

  return local;
}

// Exportar bitácora a CSV
export function exportAuditLogsToCSV(logs: AuditLogEntry[]) {
  const headers = [
    'Fecha y Hora',
    'Tipo de Acción',
    'Usuario / Actor',
    'Rol',
    'Localizador / Identificador',
    'Título / Referencia',
    'Detalle de la Operación'
  ];

  const actionLabels: Record<AuditActionType, string> = {
    create_request: 'Creación de Solicitud',
    request_modification: 'Petición de Modificación',
    cancel_modification: 'Cancelación de Modificación',
    request_cancellation: 'Solicitud de Anulación',
    cancel_cancellation: 'Descarte de Anulación',
    update_request: 'Modificación de Solicitud',
    status_change: 'Cambio de Estado / Pago',
    delete_request: 'Eliminación de Solicitud',
    create_beneficiary: 'Creación de Beneficiario',
    update_beneficiary: 'Edición de Beneficiario',
    delete_beneficiary: 'Eliminación de Beneficiario',
    create_user: 'Creación de Usuario',
    change_password: 'Cambio de Contraseña',
    toggle_user_status: 'Cambio de Estado de Usuario',
    login: 'Inicio de Sesión'
  };

  const rows = logs.map((log) => [
    `"${new Date(log.created_at).toLocaleString()}"`,
    `"${actionLabels[log.action_type] || log.action_type}"`,
    `"${log.username.replace(/"/g, '""')}"`,
    `"${log.user_role}"`,
    `"${(log.target_id || '').replace(/"/g, '""')}"`,
    `"${(log.target_title || '').replace(/"/g, '""')}"`,
    `"${log.details.replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Bitacora_Auditoria_TP_PAGOS_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

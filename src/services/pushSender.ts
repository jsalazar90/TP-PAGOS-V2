// ==============================================================================
// WEB PUSH SENDER (VIA SUPABASE EDGE FUNCTIONS) - TP PAGOS PRO
// Despacha notificaciones Web Push de forma segura delegando el firmado
// y cifrado VAPID al backend (Supabase Edge Function), sin exponer credenciales
// ni llaves privadas en el cliente del navegador.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface PushPayload {
  title: string;
  body: string;
  urgent?: boolean;
  requestId?: string;
  url?: string;
}

// Difundir notificación Push a los administradores (ej: nueva solicitud creada o urgente)
export async function broadcastPushToAdmins(payload: PushPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        target: 'admins',
        title: payload.title,
        body: payload.body,
        urgent: payload.urgent || false,
        requestId: payload.requestId || '',
        url: payload.url || (payload.requestId ? `/?request=${payload.requestId}` : '/')
      }
    });

    if (error) {
      console.warn('Error al invocar Edge Function send-push (admins):', error.message);
    }
  } catch (err) {
    console.warn('Error en broadcastPushToAdmins:', err);
  }
}

// Difundir notificación Push a todos los dispositivos registrados (ej: cuando una solicitud es pagada)
export async function broadcastPushToAll(payload: PushPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        target: 'all',
        title: payload.title,
        body: payload.body,
        urgent: payload.urgent || false,
        requestId: payload.requestId || '',
        url: payload.url || (payload.requestId ? `/?request=${payload.requestId}` : '/')
      }
    });

    if (error) {
      console.warn('Error al invocar Edge Function send-push (all):', error.message);
    }
  } catch (err) {
    console.warn('Error en broadcastPushToAll:', err);
  }
}

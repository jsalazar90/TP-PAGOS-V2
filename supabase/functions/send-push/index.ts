// ==============================================================================
// SUPABASE EDGE FUNCTION: SEND WEB PUSH NOTIFICATIONS
// Destinado a alertar a los administradores en sus dispositivos Android / PC
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obtener variables de entorno
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEAspF_YJBRvzHGj2C42G0z0PPTlRyB95mMWtQmSrpUf45QtLLJvYH-M7rMU4gdvQNWckSCKM5t09YpLw_acXoU';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'Nu3RM3KBXKHBaCnSmjTajrZVLC3u8kVIR37yP5SBPL0';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@travelpoint.com';

// Configurar WebPush con VAPID
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    let title = '🔔 TP PAGOS PRO';
    let messageBody = 'Nueva actualización en el sistema.';
    let isUrgent = false;
    let requestId = '';
    let url = '/';

    // 1. Detectar si la invocación viene de un Supabase Database Webhook
    if (body.type === 'INSERT' && body.table === 'payment_requests') {
      const rec = body.record;
      isUrgent = rec.status === 'urgente';
      title = isUrgent
        ? `🔥 NUEVA SOLICITUD URGENTE #${rec.locator || ''}`
        : `🔔 Nueva Solicitud #${rec.locator || ''}`;
      messageBody = `${rec.title || 'Servicio'} • Cliente: ${rec.client || 'N/A'} • Monto: $${rec.amount_usd || 0} USD`;
      requestId = rec.id;
      url = `/?request=${rec.id}`;
    } else if (body.type === 'UPDATE' && body.table === 'payment_requests') {
      const rec = body.record;
      const oldRec = body.old_record || {};
      
      // Notificar si se solicitó modificación
      if (rec.modification_requested && !oldRec.modification_requested) {
        title = `⚠️ Modificación Solicitada #${rec.locator || ''}`;
        messageBody = `${rec.modification_requested_by || 'Solicitante'}: ${rec.modification_reason || 'Revisar detalles'}`;
        requestId = rec.id;
        url = `/?request=${rec.id}`;
      } else {
        // No enviar notificación push para otros updates rutinarios
        return new Response(JSON.stringify({ message: 'Update ignorado para push' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else {
      // Invocación manual / directa
      title = body.title || title;
      messageBody = body.body || messageBody;
      isUrgent = body.urgent || false;
      requestId = body.requestId || '';
      url = body.url || url;
    }

    // 2. Obtener todas las suscripciones de los administradores
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_role', 'admin');

    if (subError) {
      throw new Error(`Error al leer suscripciones: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay administradores suscritos a notificaciones push actualmente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 3. Preparar el Payload para Android
    const notificationPayload = JSON.stringify({
      title,
      body: messageBody,
      urgent: isUrgent,
      requestId,
      url,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      timestamp: Date.now()
    });

    const sendResults = [];
    const deadSubIds: string[] = [];

    // 4. Enviar a cada dispositivo administrador
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        sendResults.push({ id: sub.id, status: 'sent' });
      } catch (err: any) {
        console.error(`Error enviando a sub ${sub.id}:`, err);
        // Si el endpoint expiró o la app fue desinstalada (404 o 410)
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadSubIds.push(sub.id);
        }
        sendResults.push({ id: sub.id, status: 'failed', error: err.message });
      }
    }

    // 5. Limpieza automática de suscripciones inactivas
    if (deadSubIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', deadSubIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: sendResults.filter((r) => r.status === 'sent').length,
        totalAdmins: subscriptions.length,
        results: sendResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error general en send-push:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

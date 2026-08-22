// ==============================================================================
// SCRIPT DE PRUEBA DE NOTIFICACIONES PUSH PARA ANDROID (NODE.JS)
// Ejecutar con: node scripts/test-push.js
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://frrjnamanvtobawtimlv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BKFk07uvGtfC_nICDOZn30wUNA7RaxYSMXCqx_qNu5VsCGW8YdkRKGSNg5cE2cy53RR_YZbvWDLObMpw5g1N2tE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '7kSwp1YIc2dX2Cj0FHGdosGaD6PH16zIgURWQ012eRahRANCAAShZNO7rxrXwv5yAgzmZ99MFDQO0WsWEjFwqsf6jbuVbAhlvGHZEShkjYOXBNnMud0Uf2GW71gyzmzKcOYNTdrR';

webpush.setVapidDetails('mailto:soporte@travelpoint.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function testPush() {
  console.log('🚀 Iniciando prueba de envío Web Push a dispositivos Android registrados...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_role', 'admin');

  if (error) {
    console.error('❌ Error consultando push_subscriptions:', error.message);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('ℹ️ No hay dispositivos administradores suscritos en la tabla `push_subscriptions`.');
    console.log('👉 Abre la aplicación en tu teléfono con un usuario Administrador y pulsa en "Activar Push Móvil" primero.');
    return;
  }

  console.log(`📱 Se encontraron ${subscriptions.length} dispositivo(s) administrador(es) suscrito(s).`);

  const payload = JSON.stringify({
    title: '🔥 PRUEBA URGENTE - TP PAGOS PRO',
    body: '¡Notificación en segundo plano recibida exitosamente en tu teléfono Android!',
    urgent: true,
    url: '/'
  });

  for (const sub of subscriptions) {
    try {
      console.log(`📨 Enviando a endpoint: ${sub.endpoint.substring(0, 45)}...`);
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload
      );
      console.log(`✅ ¡Notificación entregada con éxito al dispositivo ID ${sub.id}!`);
    } catch (err) {
      console.error(`❌ Error enviando al dispositivo ${sub.id}:`, err.message);
    }
  }
}

testPush();

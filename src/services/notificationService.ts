// ==============================================================================
// SERVICIO DE NOTIFICACIONES Y ALERTAS EN VIVO - TP PAGOS PRO
// Soporte para Notificaciones del Sistema (PWA/Móvil), Audio Chime y Web Push
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile } from '../types';

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BEAspF_YJBRvzHGj2C42G0z0PPTlRyB95mMWtQmSrpUf45QtLLJvYH-M7rMU4gdvQNWckSCKM5t09YpLw_acXoU';

// Función para convertir la llave VAPID base64url a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationService {
  private audioCtx: AudioContext | null = null;

  // Inicializar contexto de audio bajo demanda (requerido por políticas de navegadores)
  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('AudioContext no disponible:', e);
      return null;
    }
  }

  // Reproducir sonido de notificación sintetizado (2 tonos armónicos)
  public playChime(type: 'new_request' | 'modification' | 'urgent' = 'new_request') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'urgent') {
        // Tono de urgencia (3 pitidos rápidos)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174.66, now + 0.1);
        osc.frequency.setValueAtTime(880, now + 0.2);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'modification') {
        // Tono de alerta de modificación
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.12); // A5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Tono suave de nueva solicitud
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.2); // D6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('Error al reproducir audio chime:', e);
    }
  }

  // Verificar si las notificaciones estándar están soportadas
  public isSupported(): boolean {
    return 'Notification' in window;
  }

  // Verificar si Web Push en segundo plano está soportado
  public isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Obtener estado del permiso
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Solicitar permiso al usuario
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error solicitando permiso de notificaciones:', e);
      return 'denied';
    }
  }

  // Obtener la suscripción push actual activa
  public async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (e) {
      console.warn('Error obteniendo suscripción push:', e);
      return null;
    }
  }

  // Verificar si este dispositivo ya tiene una suscripción activa y sincronizada en Supabase
  public async isPushSubscribed(currentUser?: UserProfile): Promise<boolean> {
    const sub = await this.getPushSubscription();
    if (!sub || Notification.permission !== 'granted') {
      return false;
    }

    // Si tenemos el usuario admin y Supabase está activo, asegurar que exista en la BD
    if (currentUser && currentUser.role === 'admin' && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', sub.endpoint)
          .maybeSingle();

        // Si no está en Supabase (ej: se borró de la BD), re-sincronizarlo automáticamente
        if (!error && !data) {
          const subJson = sub.toJSON();
          if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            await supabase.from('push_subscriptions').upsert(
              {
                user_id: currentUser.id,
                user_role: currentUser.role,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
                user_agent: navigator.userAgent,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'endpoint' }
            );
          }
        }
      } catch (e) {
        console.warn('Error verificando sincronización en Supabase:', e);
      }
    }

    return true;
  }

  // Suscribir al usuario (exclusivo para administradores) al sistema Push en segundo plano
  public async subscribeAdminToPush(
    currentUser: UserProfile
  ): Promise<{ success: boolean; message: string }> {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Las notificaciones push en segundo plano están reservadas para administradores.' };
    }

    if (!this.isPushSupported()) {
      return { success: false, message: 'Tu navegador o dispositivo no soporta notificaciones Push en segundo plano.' };
    }

    try {
      // 1. Solicitar permiso de notificaciones al sistema operativo
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return { success: false, message: 'Permiso de notificaciones denegado en el dispositivo. Ve a Ajustes del teléfono para permitirlo.' };
      }

      // 2. Obtener el Service Worker activo
      const registration = await navigator.serviceWorker.ready;

      // 3. Renovar o crear la suscripción Web Push con la llave VAPID actual
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        try {
          await subscription.unsubscribe();
        } catch (e) {
          console.warn('Error al desuscribir previo:', e);
        }
        subscription = null;
      }

      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource
      });

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        return { success: false, message: 'No se pudieron extraer las llaves criptográficas del dispositivo.' };
      }

      // 4. Guardar o actualizar la suscripción en Supabase
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: currentUser.id,
            user_role: currentUser.role,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'endpoint' }
        );

        if (error) {
          console.error('Error al registrar suscripción en Supabase:', error);
          return { success: false, message: `Error en Supabase: ${error.message}` };
        }
      }

      return { success: true, message: '¡Dispositivo sincronizado en Supabase y notificaciones Push 24/7 activas!' };
    } catch (err: any) {
      console.error('Error suscribiendo a notificaciones push:', err);
      return { success: false, message: err.message || 'Error al configurar notificaciones push.' };
    }
  }

  // Desuscribir el dispositivo de las notificaciones push
  public async unsubscribeAdminFromPush(_currentUser?: UserProfile): Promise<{ success: boolean; message: string }> {
    try {
      const subscription = await this.getPushSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (isSupabaseConfigured && supabase) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
      return { success: true, message: 'Notificaciones en segundo plano desactivadas en este dispositivo.' };
    } catch (e: any) {
      console.error('Error desuscribiendo:', e);
      return { success: false, message: e.message || 'Error al desactivar notificaciones.' };
    }
  }

  // Enviar notificación local inmediata del sistema (cuando la app está en primer plano)
  public async sendNotification(
    title: string,
    options: {
      body: string;
      icon?: string;
      tag?: string;
      data?: any;
      soundType?: 'new_request' | 'modification' | 'urgent';
    }
  ): Promise<boolean> {
    // 1. Reproducir sonido y vibración
    this.playChime(options.soundType || 'new_request');
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {
        // Ignore vibration errors
      }
    }

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const notificationOptions: any = {
      body: options.body,
      icon: options.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: options.tag || 'tp-pagos-alert',
      renotify: true,
      data: options.data,
      silent: false
    };

    try {
      // Priorizar ServiceWorkerRegistration si está disponible (mejor para PWA en móviles)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      }

      // Fallback a Notification API estándar
      new Notification(title, notificationOptions);
      return true;
    } catch (e) {
      console.warn('Error enviando notificación del sistema:', e);
      return false;
    }
  }
}

export const notificationService = new NotificationService();

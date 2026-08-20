// ==============================================================================
// SERVICIO DE NOTIFICACIONES Y ALERTAS EN VIVO - TP PAGOS PRO
// Soporte para Notificaciones del Sistema (PWA/Móvil), Audio Chime y Web Push
// ==============================================================================

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

  // Verificar si las notificaciones están soportadas
  public isSupported(): boolean {
    return 'Notification' in window;
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

  // Enviar notificación del sistema (al teléfono / escritorio)
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

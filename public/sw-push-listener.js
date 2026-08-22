// ==============================================================================
// SERVICE WORKER - BACKGROUND WEB PUSH NOTIFICATION LISTENER
// TP PAGOS PRO - Android Background Alert Handler
// ==============================================================================

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[SW Push] Evento push recibido sin payload de datos.');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: '🔔 TP PAGOS PRO',
      body: event.data.text() || 'Nueva notificación de pago recibida',
      url: '/'
    };
  }

  const isUrgent = payload.urgent === true || (payload.title && payload.title.includes('URGENTE'));
  const isModification = payload.isModification === true || (payload.title && payload.title.includes('Modificación'));

  const title = payload.title || (isUrgent ? '🔥 SOLICITUD URGENTE - TP PAGOS' : '🔔 Nueva Solicitud - TP PAGOS');
  
  const options = {
    body: payload.body || 'Tienes una nueva solicitud pendiente de revisión.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || (payload.requestId ? `req-${payload.requestId}` : `tp-pagos-alert-${Date.now()}`),
    renotify: true,
    requireInteraction: isUrgent, // En solicitudes urgentes se mantiene fija hasta que se abra
    vibrate: isUrgent ? [300, 100, 300, 100, 400] : [200, 100, 200],
    data: {
      url: payload.url || '/',
      requestId: payload.requestId || null,
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'view-request',
        title: '📂 Ver Solicitud'
      },
      {
        action: 'dismiss',
        title: 'Cerrar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejo del clic sobre la notificación en la barra de Android
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Si la app ya está abierta en alguna pestaña o standalone PWA, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if (targetUrl !== '/' && 'navigate' in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      // Si la app está totalmente cerrada, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

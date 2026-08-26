// ==============================================================================
// SERVICE WORKER - BACKGROUND WEB PUSH NOTIFICATION LISTENER
// TP PAGOS PRO - Android Background Alert Handler & Request Deep Link
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
  const isPaid = payload.isPaid === true || (payload.title && (payload.title.includes('Pagada') || payload.title.includes('PAGADA') || payload.title.includes('Liquidada')));

  const title = payload.title || (isUrgent ? '🔥 SOLICITUD URGENTE - TP PAGOS' : isPaid ? '✅ SOLICITUD PAGADA - TP PAGOS' : '🔔 Nueva Solicitud - TP PAGOS');
  const reqId = payload.requestId || payload.id || null;
  const directUrl = reqId ? `/?request=${encodeURIComponent(reqId)}` : (payload.url || '/');

  const options = {
    body: payload.body || 'Tienes una nueva solicitud pendiente de revisión.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || (reqId ? `req-${reqId}` : `tp-pagos-alert-${Date.now()}`),
    renotify: true,
    requireInteraction: isUrgent, // En solicitudes urgentes se mantiene fija en Android
    vibrate: isUrgent ? [300, 100, 300, 100, 400] : [200, 100, 200],
    data: {
      url: directUrl,
      requestId: reqId,
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

  const reqId = event.notification.data?.requestId;
  const targetUrl = reqId
    ? `/?request=${encodeURIComponent(reqId)}`
    : (event.notification.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // 1. Si la app ya está abierta en alguna pestaña o standalone PWA, enfocarla y enviarle el mensaje directo
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          if ('focus' in client) {
            client.focus();
          }
          if (reqId) {
            client.postMessage({
              type: 'OPEN_REQUEST_DETAIL',
              requestId: reqId
            });
          } else if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // 2. Si la app está totalmente cerrada, abrir una nueva ventana directamente con la solicitud
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

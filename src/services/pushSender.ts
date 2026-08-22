// ==============================================================================
// WEB PUSH SENDER (RFC 8291 / RFC 8292 - PURE WEBCRYPTO) - TP PAGOS PRO
// Permite que cuando cualquier operador cree una solicitud, se despachen
// notificaciones Web Push directas a todos los teléfonos Android de los administradores.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BEAspF_YJBRvzHGj2C42G0z0PPTlRyB95mMWtQmSrpUf45QtLLJvYH-M7rMU4gdvQNWckSCKM5t09YpLw_acXoU';

const VAPID_PRIVATE_KEY =
  import.meta.env.VAPID_PRIVATE_KEY ||
  'Nu3RM3KBXKHBaCnSmjTajrZVLC3u8kVIR37yP5SBPL0';

const VAPID_SUBJECT = 'mailto:soporte@travelpoint.com';

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const view = new Uint8Array(bytes);
  const len = view.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pubBytes = base64UrlDecode(VAPID_PUBLIC_KEY);
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: VAPID_PRIVATE_KEY,
    x: base64UrlEncode(pubBytes.slice(1, 33)),
    y: base64UrlEncode(pubBytes.slice(33, 65)),
    ext: true
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigB64 = base64UrlEncode(signature);
  return `${unsignedToken}.${sigB64}`;
}

async function encryptAes128Gcm(payloadString: string, p256dhBase64: string, authBase64: string): Promise<Uint8Array> {
  const userPublicKeyBytes = base64UrlDecode(p256dhBase64);
  const userAuthBytes = base64UrlDecode(authBase64);

  // 1. Generate local ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  // 2. Import subscriber public key
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes as unknown as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Derive shared secret (ECDH)
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    localKeyPair.privateKey,
    256
  );

  // 4. Derive pseudo-random key (PRK) using auth token as salt
  const infoIkm = new Uint8Array(18 + userPublicKeyBytes.length + localPublicKeyBytes.length);
  infoIkm.set(new TextEncoder().encode('WebPush: info\0'), 0);
  infoIkm.set(userPublicKeyBytes, 14);
  infoIkm.set(localPublicKeyBytes, 14 + userPublicKeyBytes.length);

  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: userAuthBytes as unknown as BufferSource,
      info: infoIkm as unknown as BufferSource
    },
    await crypto.subtle.importKey('raw', sharedSecret as unknown as BufferSource, { name: 'HKDF' }, false, ['deriveBits']),
    256
  );

  // 5. Generate 16-byte random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prkKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']);

  const infoCek = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: infoCek },
    prkKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  const infoNonce = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: infoNonce },
    prkKey,
    96
  );

  // 6. Plaintext with delimiter 0x02
  const plainTextBytes = new TextEncoder().encode(payloadString);
  const padded = new Uint8Array(plainTextBytes.length + 1);
  padded.set(plainTextBytes, 0);
  padded[plainTextBytes.length] = 2;

  // 7. Encrypt with AES-GCM
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce), tagLength: 128 },
    cekKey,
    padded
  );

  // 8. Build AES128GCM body: salt (16 bytes) || rs (4 bytes = 4096) || idlen (1 byte = 65) || localPublicKey (65 bytes) || cipherText
  const rs = 4096;
  const rsBytes = new Uint8Array([(rs >> 24) & 0xff, (rs >> 16) & 0xff, (rs >> 8) & 0xff, rs & 0xff]);
  const idlen = localPublicKeyBytes.length;

  const body = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length + cipherText.byteLength);
  body.set(salt, 0);
  body.set(rsBytes, 16);
  body[20] = idlen;
  body.set(localPublicKeyBytes, 21);
  body.set(new Uint8Array(cipherText), 21 + localPublicKeyBytes.length);

  return body;
}

export interface PushPayload {
  title: string;
  body: string;
  urgent?: boolean;
  requestId?: string;
  url?: string;
}

// Difundir notificación Push a todos los administradores en segundo plano
export async function broadcastPushToAdmins(payload: PushPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_role', 'admin');

    if (error || !subscriptions || subscriptions.length === 0) {
      return;
    }

    const payloadJson = JSON.stringify({
      title: payload.title,
      body: payload.body,
      urgent: payload.urgent || false,
      requestId: payload.requestId || '',
      url: payload.url || (payload.requestId ? `/?request=${payload.requestId}` : '/')
    });

    const deadSubIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const urlObj = new URL(sub.endpoint);
          const audience = `${urlObj.protocol}//${urlObj.host}`;
          const jwt = await createVapidJwt(audience);
          const encryptedBody = await encryptAes128Gcm(payloadJson, sub.p256dh, sub.auth);

          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              TTL: '86400',
              Urgency: payload.urgent ? 'high' : 'normal',
              'Content-Encoding': 'aes128gcm',
              'Content-Type': 'application/octet-stream',
              Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`
            },
            body: encryptedBody as unknown as BodyInit
          });

          if (response.status === 404 || response.status === 410) {
            deadSubIds.push(sub.id);
          }
        } catch (e) {
          console.warn(`Error enviando push al admin ${sub.id}:`, e);
        }
      })
    );

    // Limpiar suscripciones expiradas
    if (deadSubIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', deadSubIds);
    }
  } catch (err) {
    console.warn('Error en broadcastPushToAdmins:', err);
  }
}

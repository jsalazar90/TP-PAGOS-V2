// Pure Web Crypto implementation of Web Push (RFC 8291 / RFC 8292)
// Works in Browser and Node.js 18+ without any external dependencies!

function base64UrlEncode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  const view = new Uint8Array(bytes);
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert VAPID private raw key (32 bytes) to PKCS8 DER format for importing
function getPkcs8DerFromRawPrivate(rawPrivateBytes) {
  const prefix = new Uint8Array([
    0x30, 0x77, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x5d, 0x30, 0x5b, 0x02, 0x01,
    0x01, 0x04, 0x20
  ]);
  const suffix = new Uint8Array([
    0xa1, 0x35, 0x03, 0x33, 0x00
  ]);
  // Total DER structure
  const result = new Uint8Array(prefix.length + rawPrivateBytes.length + suffix.length + 65);
  result.set(prefix, 0);
  result.set(rawPrivateBytes, prefix.length);
  // We can also import via raw WebCrypto format in browsers supporting { name: 'ECDSA', namedCurve: 'P-256' } with JWK!
}

async function createVapidJwt(audience, subject, publicKeyBase64, privateKeyBase64) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key using JWK
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64,
    x: base64UrlEncode(base64UrlDecode(publicKeyBase64).slice(1, 33)),
    y: base64UrlEncode(base64UrlDecode(publicKeyBase64).slice(33, 65)),
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

  // Convert DER signature to raw 64-byte r|s if needed, or WebCrypto already gives 64-byte raw for ES256
  const sigB64 = base64UrlEncode(signature);
  return `${unsignedToken}.${sigB64}`;
}

async function encryptAes128Gcm(payloadString, p256dhBase64, authBase64) {
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
    userPublicKeyBytes,
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
  const authKey = await crypto.subtle.importKey(
    'raw',
    userAuthBytes,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // PRK_key = HKDF-Extract(userAuth, sharedSecret)
  // Info for IKM: "WebPush: info" || 0x00 || userPublicKey || localPublicKey
  const infoIkm = new Uint8Array(18 + userPublicKeyBytes.length + localPublicKeyBytes.length);
  infoIkm.set(new TextEncoder().encode('WebPush: info\0'), 0);
  infoIkm.set(userPublicKeyBytes, 14);
  infoIkm.set(localPublicKeyBytes, 14 + userPublicKeyBytes.length);

  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: userAuthBytes,
      info: infoIkm
    },
    await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']),
    256
  );

  // 5. Generate 16-byte random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HKDF-Extract(salt, ikm)
  const prkKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']);

  // Derive CEK: info = "Content-Encoding: aes128gcm" || 0x00
  const infoCek = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: infoCek },
    prkKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  // Derive Nonce (12 bytes)
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
  padded[plainTextBytes.length] = 2; // delimiter

  // 7. Encrypt with AES-GCM
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce), tagLength: 128 },
    cekKey,
    padded
  );

  // 8. Build AES128GCM body: salt (16 bytes) || rs (4 bytes = 4096) || idlen (1 byte = 65) || localPublicKey (65 bytes) || cipherText
  const rs = 4096;
  const rsBytes = new Uint8Array([ (rs >> 24) & 0xff, (rs >> 16) & 0xff, (rs >> 8) & 0xff, rs & 0xff ]);
  const idlen = localPublicKeyBytes.length; // 65

  const body = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length + cipherText.byteLength);
  body.set(salt, 0);
  body.set(rsBytes, 16);
  body[20] = idlen;
  body.set(localPublicKeyBytes, 21);
  body.set(new Uint8Array(cipherText), 21 + localPublicKeyBytes.length);

  return body;
}

async function test() {
  const { createClient } = await import('@supabase/supabase-js');
  const dotenv = await import('dotenv');
  dotenv.config();

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_role', 'admin');

  if (!subs || subs.length === 0) {
    console.log('No subs found');
    return;
  }

  const sub = subs[0];
  const urlObj = new URL(sub.endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const jwt = await createVapidJwt(
    audience,
    'mailto:soporte@travelpoint.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title: '🔔 ALERTA EN VIVO - TP PAGOS PRO',
    body: '¡Notificación Push recibida en tu Android!',
    urgent: true
  });

  const encryptedBody = await encryptAes128Gcm(payload, sub.p256dh, sub.auth);

  console.log('Enviando petición a Google FCM...');
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Urgency': 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': `vapid t=${jwt}, k=${process.env.VITE_VAPID_PUBLIC_KEY}`
    },
    body: encryptedBody
  });

  console.log('FCM Status:', res.status, res.statusText);
}

test();

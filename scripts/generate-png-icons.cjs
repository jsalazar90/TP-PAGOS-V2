const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer from RGBA pixels
function createPng(width, height, getRgbaAt) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getRgbaAt(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // Helper CRC32
  function crc32(buf) {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crcTable[(crc ^ buf[i]) & 0xff]) ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Design icon pixel generator: Dark Indigo background (#0f172a / #1e1b4b) with glowing TP logo (#4f46e5 to #06b6d4)
function drawTpLogo(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.46;
  const dist = Math.hypot(x - cx, y - cy);

  // Background rounded rectangle
  const cornerR = w * 0.22;
  const inBorder = (
    (x >= cornerR && x <= w - cornerR) ||
    (y >= cornerR && y <= h - cornerR) ||
    Math.hypot(x - cornerR, y - cornerR) <= cornerR ||
    Math.hypot(x - (w - cornerR), y - cornerR) <= cornerR ||
    Math.hypot(x - cornerR, y - (h - cornerR)) <= cornerR ||
    Math.hypot(x - (w - cornerR), y - (h - cornerR)) <= cornerR
  );

  if (!inBorder) return [0, 0, 0, 0];

  // Gradient background (#0f172a to #312e81)
  const bgT = y / h;
  let r = Math.round(15 + bgT * 34);
  let g = Math.round(23 + bgT * 23);
  let b = Math.round(42 + bgT * 87);
  let a = 255;

  // Outer glowing ring
  const ringInner = w * 0.32;
  const ringOuter = w * 0.38;
  if (dist >= ringInner && dist <= ringOuter) {
    const ringT = (dist - ringInner) / (ringOuter - ringInner);
    const glowR = Math.round(99 + ringT * 100);
    const glowG = Math.round(102 + ringT * 120);
    const glowB = Math.round(241 + ringT * 14);
    r = Math.round(r * 0.3 + glowR * 0.7);
    g = Math.round(g * 0.3 + glowG * 0.7);
    b = Math.round(b * 0.3 + glowB * 0.7);
  }

  // T and P Letter Shapes centered
  const nx = (x - cx) / w; // -0.5 to 0.5
  const ny = (y - cy) / h; // -0.5 to 0.5

  // T Bar (Top horizontal)
  const isTTop = (ny >= -0.22 && ny <= -0.12 && nx >= -0.25 && nx <= 0.05);
  // T Stem (Vertical)
  const isTStem = (nx >= -0.13 && nx <= -0.05 && ny >= -0.22 && ny <= 0.22);

  // P Stem (Vertical)
  const isPStem = (nx >= 0.02 && nx <= 0.10 && ny >= -0.22 && ny <= 0.22);
  // P Loop (Right curved loop)
  const pDist = Math.hypot(nx - 0.10, ny - (-0.08));
  const isPLoop = (pDist >= 0.06 && pDist <= 0.14 && nx >= 0.08 && ny >= -0.22 && ny <= 0.06);

  if (isTTop || isTStem || isPStem || isPLoop) {
    // Vibrant Teal/Emerald gradient (#38bdf8 / #10b981)
    const tVal = (nx + 0.3) / 0.6;
    r = Math.round(56 + tVal * 150);
    g = Math.round(189 + tVal * 30);
    b = Math.round(248 - tVal * 100);
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PWA icons...');

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, drawTpLogo));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, drawTpLogo));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, drawTpLogo));
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512.png'), createPng(512, 512, drawTpLogo));

console.log('PWA PNG icons generated successfully!');

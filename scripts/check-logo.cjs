const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
if (fs.existsSync(logoPath)) {
  const buf = fs.readFileSync(logoPath);
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    console.log(`Logo PNG dimensions: ${width}x${height}`);
  } else {
    console.log('File is not PNG');
  }
} else {
  console.log('Logo file not found');
}

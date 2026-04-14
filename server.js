const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const TARGET_URL = 'https://www.serrure-metal-art.fr/';
const DATA_FILE = path.join(__dirname, 'data', 'scans.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Load or initialize scan data
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { total: 0, scans: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(express.static(path.join(__dirname, 'public')));

// QR Code scan redirect endpoint
app.get('/scan', (req, res) => {
  const data = loadData();
  data.total += 1;
  data.scans.push({
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] || 'unknown'
  });
  saveData(data);
  res.redirect(302, TARGET_URL);
});

// API endpoint for stats
app.get('/api/stats', (req, res) => {
  const data = loadData();
  res.json({
    total: data.total,
    lastScan: data.scans.length > 0 ? data.scans[data.scans.length - 1].timestamp : null,
    recentScans: data.scans.slice(-10).reverse()
  });
});

// Generate QR code image as data URL
app.get('/api/qrcode', async (req, res) => {
  const scanUrl = `${BASE_URL}/scan`;
  try {
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      }
    });
    res.json({ qrDataUrl, scanUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n QR Tracker démarré sur http://localhost:${PORT}`);
  console.log(` URL de scan : ${BASE_URL}/scan`);
  console.log(` Destination : ${TARGET_URL}`);
  console.log(` Dashboard   : http://localhost:${PORT}\n`);
});

const express = require('express');
const path = require('path');
const multer = require('multer');
const { io } = require('socket.io-client');
const mqtt = require('mqtt');
const DataBuffer = require('./utils/buffer.cjs');
const { getGeoData } = require('./utils/helpers.cjs');
const { analyzeFileUpload } = require('./utils/LLM.cjs');

const buffer = new DataBuffer(100);
const HONEYPOT_ID = 'node3';
const PORT = 3003;
let heartbeatInterval = null;
let collectorOnline = false;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

const mqttClient = mqtt.connect('mqtt://mosquitto:1883', { 
  reconnectPeriod: 1000 
});

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to broker');

  mqttClient.subscribe(`honeypot/${HONEYPOT_ID}/collector_status`, { qos: 1 }, (err) => {
    if (err) console.error('[MQTT] subscribe error.');
  });

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      const hb = {
        honeypotId: HONEYPOT_ID,
        port: PORT,
        timestamp: new Date().toISOString(),
        status: 'online'
      };
      mqttClient.publish(`honeypot/${HONEYPOT_ID}/heartbeat`, JSON.stringify(hb), { qos: 1, retain: true });
    }, 5000); // 5s
  }
});

mqttClient.on('message', (topic, msg) => {
  try {
    const payload = JSON.parse(msg.toString());
    if (topic === `honeypot/${HONEYPOT_ID}/collector_status`) {
      collectorOnline = (payload.collectorStatus === 'online');
      console.log(`[MQTT] Collector status for ${HONEYPOT_ID}:`, payload.collectorStatus);

      if (collectorOnline && socket && socket.connected) {
        const buffered = buffer.flush();
        buffered.forEach(d => {
          socket.emit('honeypot_data', d);
        });
        if (buffered.length) console.log(`[BUFFER] Flushed ${buffered.length} items to collector via Socket.IO`);
      }
    }
  } catch (e) {
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] error', err && err.message ? err.message : err);
  collectorOnline = false;
});

mqttClient.on('close', () => {
  console.log('[MQTT] connection closed');
  collectorOnline = false;
});

socket.on('connect', async () => {
  console.log('Honeypot Node 1 connected to collector server via Socket.IO');

  if (collectorOnline) {
    const bufferedData = buffer.flush();
    bufferedData.forEach(data => {
      socket.emit('honeypot_data', data);
    });
    if (bufferedData.length) console.log(`[BUFFER] Flushed ${bufferedData.length} buffered items on Socket connect`);
  } else {
    console.log('[BUFFER] Collector not reported online yet — buffer retained');
  }
});

socket.on('connect_error', (error) => {
  console.error('Failed to connect to collector server (Socket.IO)', error && error.message ? error.message : error);
});

socket.on('disconnect', () => {
  console.log('Disconnected from collector - buffering mode activated (Socket.IO)');
});

// Save uploaded file on memory, not on disk (<- potential security issue)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded'
      });
    }
    const clientIp = req.body.clientIp || 'unknown';
    const fileName = req.file.originalname;
    const fileExtension = fileName.split('.').pop();
    const geoData = await getGeoData(clientIp);
    const { severity, description } = await analyzeFileUpload(fileName, fileExtension, req.file.size);

    const attackData = {
      honeypotId: HONEYPOT_ID,
      port: PORT,
      sourceIp: clientIp,
      severity,
      description,
      timestamp: new Date().toISOString(),
      geoData
    };

    if (socket.connected && collectorOnline) {
      socket.emit('honeypot_data', attackData);
      console.log('File upload data sent to collector via Socket.IO');
    } else {
      buffer.add(attackData);
      console.log(`Data buffered. Buffer size: ${buffer.size()}`);
    }

    // Fake message
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileName 
    });

  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Honeypot Node 3 server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down honeypot node3...');
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (mqttClient) mqttClient.end(true);
  if (socket) socket.disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
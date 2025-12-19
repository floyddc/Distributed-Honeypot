const express = require('express');
const path = require('path');
const { io } = require('socket.io-client');
const mqtt = require('mqtt');
const DataBuffer = require('./utils/buffer.cjs');
const { getGeoData } = require('./utils/helpers.cjs');
const { analyzeLogin } = require('./utils/LLM.cjs');

const HONEYPOT_ID = 'node1';
const PORT = 3001;
const buffer = new DataBuffer(100);
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

// API endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, clientIp } = req.body;
    const geoData = await getGeoData(clientIp);
    const { severity, description } = await analyzeLogin(username, password);

    const attackData = {
      honeypotId: HONEYPOT_ID,
      port: PORT,
      sourceIp: clientIp,
      severity: severity,
      description: description,
      timestamp: new Date().toISOString(),
      geoData: geoData
    };

    //Admin Credentials Check
    if (username === 'admin' && password === 'password123') {
      const successAttack = {
        ...attackData,
        severity: 'high',
        description: 'Compromised Credentials Login: admin/password123',
        type: 'login'
      };

      if (socket.connected && collectorOnline) {
        socket.emit('honeypot_data', successAttack);
        // Notify dashboard to switch view
        socket.emit('honeypot_interaction', {
          honeypotId: HONEYPOT_ID,
          sessionId: req.body.sessionId,
          type: 'navigation',
          view: 'dashboard',
          timestamp: new Date().toISOString()
        });
      } else {
        buffer.add(successAttack);
      }

      return res.json({ success: true, message: 'Login successful' });
    }

    //SQL Injection Bypass Check (Classic Pattern)
    // Matches patterns like: ' OR '1'='1 --   or   ' OR 1=1
    const sqliPattern = /'\s+OR\s+('1'='1|1=1)/i;

    if (sqliPattern.test(username)) {
      const sqliAttack = {
        ...attackData,
        severity: 'critical',
        description: `SQL Injection: Auth Bypass Successful [Payload: ${username}]`,
        type: 'sql_injection'
      };

      if (socket.connected && collectorOnline) {
        socket.emit('honeypot_data', sqliAttack);
        // Notify dashboard to switch view
        socket.emit('honeypot_interaction', {
          honeypotId: HONEYPOT_ID,
          sessionId: req.body.sessionId, // We need sessionId here, checking if frontend sends it
          type: 'navigation',
          view: 'dashboard',
          timestamp: new Date().toISOString()
        });
      } else {
        buffer.add(sqliAttack);
      }

      return res.json({ success: true, message: 'Login successful (Bypassed)' });
    }

    //Failed Attempts Logic (Existing)
    if (socket.connected && collectorOnline) {
      socket.emit('honeypot_data', attackData);
      console.log('Attack data sent to collector via Socket.IO');
    } else {
      buffer.add(attackData);
      console.log(`Data buffered. Buffer size: ${buffer.size()}`);
    }

    //Varied responses for honeypot realism
    if (severity === 'critical') {
      if (description.includes('SQL injection') || description.includes('SQLI')) {
        return res.status(500).json({
          success: false,
          message: "Internal Server Error: SQL execution error near 'OR': syntax error"
        });
      }
      if (description.includes('XSS attack') || description.includes('XSS')) {
        return res.status(403).json({
          success: false,
          message: "Security violation detected. Your IP has been logged for further investigation."
        });
      }
    }

    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });

  } catch (error) {
    console.error('Error processing login attempt', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// New endpoint to track file downloads as attacks
app.post('/api/download', async (req, res) => {
  try {
    const { filename, clientIp } = req.body;
    const geoData = await getGeoData(clientIp);

    const attackData = {
      honeypotId: HONEYPOT_ID,
      port: PORT,
      sourceIp: clientIp,
      severity: 'high',
      description: `File Download Attempt: ${filename}`,
      timestamp: new Date().toISOString(),
      geoData: geoData,
      type: 'exfiltration'
    };

    if (socket.connected && collectorOnline) {
      socket.emit('honeypot_data', attackData);
      console.log(`[ATTACK] Data exfiltration logged: ${filename}`);
    } else {
      buffer.add(attackData);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging download attack', error);
    res.status(500).json({ success: false });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Honeypot Node 1 server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down honeypot node1...');
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
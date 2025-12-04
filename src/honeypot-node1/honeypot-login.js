const express = require('express');
const path = require('path');
const { io } = require('socket.io-client');
const DataBuffer = require('./utils/buffer.cjs');
const { getGeoData, getPublicIP } = require('./utils/helpers.cjs');
const { evaluateLoginSeverity, recognizeThreat } = require('./utils/GeminiAPI.js');
const HONEYPOT_ID = 'node1';
const PORT = 3001;
let heartbeatInterval;
const buffer = new DataBuffer(100);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const socket = io('http://collector-server:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

socket.on('connect', async () => {
    console.log('Honeypot Node 1 connected to collector server');
    
    socket.emit('honeypot_status', {
        honeypotId: HONEYPOT_ID,
        status: 'online',
        port: PORT,
        timestamp: new Date().toISOString()
    });
    
    heartbeatInterval = setInterval(() => {
        socket.emit('honeypot_heartbeat', {
            honeypotId: HONEYPOT_ID,
            port: PORT,
            timestamp: new Date().toISOString()
        });
    }, 5000);   // 5s
    
    // Flush buffer on connect 
    const bufferedData = buffer.flush();
    bufferedData.forEach(data => {
        socket.emit('honeypot_data', data);
    });
});

socket.on('connect_error', (error) => {
    console.error('Failed to connect to collector server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from collector - buffering mode activated | Heartbeat stopped');
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
});

// API endpoint 
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, clientIp } = req.body;
        const geoData = await getGeoData(clientIp);
        const severity = await evaluateLoginSeverity(username, password);
        const description = await recognizeThreat(username, password);

        const attackData = {
            honeypotId: HONEYPOT_ID,
            port: PORT,
            sourceIp: clientIp,
            severity: severity,
            description: description,
            timestamp: new Date().toISOString(),
            geoData: geoData
        };

        // Send to collector or buffer
        if (socket.connected) {
            socket.emit('honeypot_data', attackData);
            console.log('Attack data sent to collector via Socket.IO');
        } else {
            buffer.add(attackData);
            console.log(`Data buffered. Buffer size: ${buffer.size()}`);
        }

        // Fake error message
        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });

    } catch (error) {
        console.error('Error processing login attempt');
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Honeypot Node 1 server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    socket.disconnect();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    socket.disconnect();
    process.exit(0);
});
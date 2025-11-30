const express = require('express');
const path = require('path');
const { io } = require('socket.io-client');
const DataBuffer = require('./utils/buffer.cjs');
const { getGeoData, getPublicIP } = require('./utils/helpers.cjs');
const { evaluateLoginSeverity, recognizeThreat } = require('./utils/GeminiAPI.js');
const HONEYPOT_ID = 'node1';
const PORT = 3001;
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const socket = io('http://collector-server:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

const buffer = new DataBuffer(100);

socket.on('connect', async () => {
    console.log('Honeypot Node 1 connected to collector server');
    
    // Flush buffer on connect 
    const bufferedData = buffer.flush();
    bufferedData.forEach(data => {
        socket.emit('honeypot_data', data);
    });
});

socket.on('data_received', (ack) => {
    console.log('Collector acknowledged:', ack);
});

socket.on('connect_error', (error) => {
    console.error('Failed to connect to collector server:', error.message);
});

socket.on('disconnect', () => {
    console.log('Disconnected from collector - buffering mode activated');
});

// API endpoint 
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const publicIp = await getPublicIP();
        const geoData = await getGeoData(publicIp);
        const severity = await evaluateLoginSeverity(username, password);
        const description = await recognizeThreat(username, password);

        const attackData = {
            honeypotId: HONEYPOT_ID,
            port: PORT,
            sourceIp: publicIp,
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
        console.error('Error processing login attempt:', error);
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
    socket.disconnect();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    socket.disconnect();
    process.exit(0);
});
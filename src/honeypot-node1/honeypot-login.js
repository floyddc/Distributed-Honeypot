const express = require('express');
const path = require('path');
const { io } = require('socket.io-client');
const DataBuffer = require('./utils/buffer.cjs');

const app = express();
const PORT = 3001;

// Socket connection 
const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000', {
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

app.use(express.static(path.join(__dirname, 'dist')));

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
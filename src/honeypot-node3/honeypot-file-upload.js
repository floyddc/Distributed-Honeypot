const express = require('express');
const path = require('path');
const multer = require('multer');
const { io } = require('socket.io-client');
const DataBuffer = require('./utils/buffer.cjs');
const { getGeoData, getPublicIP } = require('./utils/helpers.cjs');
const { evaluateFileSeverity } = require('./utils/severity-evaluator.js');
const buffer = new DataBuffer(100);

const app = express();
const PORT = 3003;

// Save uploaded file on memory, not on disk (<- potential security issue)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

socket.on('connect', async () => {
    console.log('Honeypot Node 3 connected to collector server');
    
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
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const fileName = req.file.originalname;
        const fileExtension = fileName.split('.').pop();
        const publicIp = await getPublicIP();
        const geoData = await getGeoData(publicIp);
        const severity = await evaluateFileSeverity(fileExtension);

        const attackData = {
            honeypotId: 'node3',
            sourceIp: publicIp,
            destinationPort: 3003,
            protocol: 'FTP',
            payload: JSON.stringify({
                fileName: fileName,
                fileExtension: fileExtension,
                fileSize: req.file.size
            }),
            severity: severity,
            timestamp: new Date().toISOString(),
            geoData: geoData
        };

        // Send to collector or buffer
        if (socket.connected) {
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
            fileName: fileName
        });

    } catch (error) {
        console.error('Error processing file upload:', error);
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
    console.log(`Honeypot Node 3 server running on port ${PORT}`);
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
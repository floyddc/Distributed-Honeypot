const express = require('express');
const path = require('path');
const multer = require('multer');
const { io } = require('socket.io-client');
const DataBuffer = require('./utils/buffer.cjs');
const { getGeoData } = require('./utils/helpers.cjs');
const { analyzeFileUpload } = require('./utils/LLM.js');
const buffer = new DataBuffer(100);
const HONEYPOT_ID = 'node3';
const PORT = 3003;
let heartbeatInterval;
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Save uploaded file on memory, not on disk (<- potential security issue)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

socket.on('connect', async () => {
    console.log('Honeypot Node 3 connected to collector server');
    
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
        const {severity, description} = await analyzeFileUpload(fileName, fileExtension, req.file.size);
        
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
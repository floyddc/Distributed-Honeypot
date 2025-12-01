const { Server } = require('ssh2');
const fs = require('fs');
const crypto = require('crypto');
const { io } = require('socket.io-client');
const { getGeoData, getPublicIP } = require('./utils/helpers.cjs');
const { evaluateLoginSeverity } = require('./utils/GeminiAPI.js');
const DataBuffer = require('./utils/buffer.cjs');
const buffer = new DataBuffer(100);
const HONEYPOT_ID = 'node2';
const PORT = process.env.SSH_PORT || 2222;
let heartbeatInterval;

const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

socket.on('connect', () => {
    console.log('SSH Honeypot connected to collector server');
    
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

// Generate a dummy SSH host key
const hostKey = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    }
});

const server = new Server({
    hostKeys: [hostKey.privateKey]
}, (client) => {
    console.log('SSH Client connected!');
    
    let clientInfo = {
        sourceIP: client._sock.remoteAddress,
        sourcePort: client._sock.remotePort,
        timestamp: new Date().toISOString(),
        honeypotId: 'node2'
    };

    client.on('authentication', async (ctx) => {
        try {
            const publicIp = await getPublicIP();
            const geoData = await getGeoData(publicIp);
            const username = ctx.username;
            const password = ctx.method === 'password' ? (ctx.password || '') : 'key-based';
            
            console.log(`SSH Auth attempt: ${username}/${password} (${ctx.method}) from ${clientInfo.sourceIP}`);
            
            let severity = 'low';
            if (ctx.method === 'password' && ctx.password) {
                severity = await evaluateLoginSeverity(username, ctx.password);
            } else {
                severity = username === 'root' || username === 'admin' ? 'medium' : 'low';
            }

            const authData = {
                honeypotId: HONEYPOT_ID,
                port: PORT,
                sourceIp: publicIp,
                severity: severity,
                description: 'SSH Login attempt',
                timestamp: new Date().toISOString(),
                geoData: geoData
            };

            // Send to collector or buffer
            if (socket.connected) {
                socket.emit('honeypot_data', authData);
                console.log('SSH auth data sent to collector via Socket.IO');
            } else {
                buffer.add(authData);
                console.log(`Data buffered. Buffer size: ${buffer.size()}`);
            }

            // Fake error message
            setTimeout(() => {
                if (ctx.method === 'password') {
                    ctx.reject(['publickey'], false);
                } else {
                    ctx.reject(['password'], false);
                }
            }, 1000 + Math.random() * 2000);
            
        } catch (error) {
            console.error('Error processing SSH auth attempt');
            ctx.reject();
        }
    });

    client.on('ready', () => {
        console.log('SSH Client authenticated (should never happen!)');
    });

    client.on('end', () => {
        console.log('SSH Client disconnected');
    });

    client.on('error', (err) => {
        console.log('SSH Client error');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SSH Honeypot listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down SSH honeypot...');
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    server.close();
    socket.disconnect();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Shutting down SSH honeypot...');
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    server.close();
    socket.disconnect();
    process.exit(0);
});
const { Server } = require('ssh2');
const fs = require('fs');
const crypto = require('crypto');
const { io } = require('socket.io-client');
const { getGeoData, calculateSeverity, getPublicIP } = require('./utils/helpers.cjs');
const DataBuffer = require('./utils/buffer.cjs');
const buffer = new DataBuffer(100);

// Socket connection
const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

socket.on('connect', () => {
    console.log('SSH Honeypot connected to collector server');
    
    // Flush buffer on connect
    const bufferedData = buffer.flush();
    bufferedData.forEach(data => {
        socket.emit('honeypot_data', data);
    });
});

socket.on('connect_error', (error) => {
    console.error('Failed to connect to collector server:', error);
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
        honeypotId: 'node2',
        attackType: 'ssh_connection'
    };

    // Handle authentication attempts
    client.on('authentication', async (ctx) => {
        const publicIp = await getPublicIP();

        const authData = {
            honeypotId: 'node2',
            sourceIp: publicIp,
            destinationPort: PORT,
            protocol: 'TCP',
            payload: JSON.stringify({
                username: ctx.username,
                password: ctx.password || null,
                method: ctx.method
            }),
            severity: calculateSeverity(ctx),
            timestamp: new Date().toISOString(),
            geoData: await getGeoData(publicIp)
        };

        console.log(`SSH Auth attempt: ${ctx.username}/${ctx.password || 'key-based'} from ${clientInfo.sourceIP}`);
        
        // Send via Socket.IO or buffer
        if (socket.connected) {
            socket.emit('honeypot_data', authData);
        } else {
            buffer.add(authData);
            console.log(`Data buffered. Buffer size: ${buffer.size()}`);
        }

        // Always reject authentication
        if (ctx.method === 'password') {
            // Fake random delay
            setTimeout(() => {
                ctx.reject(['publickey'], false);
            }, 1000 + Math.random() * 2000); 
        } else {
            ctx.reject(['password'], false);
        }
    });

    client.on('ready', () => {
        console.log('SSH Client authenticated');
    });

    client.on('end', () => {
        console.log('SSH Client disconnected');
    });

    client.on('error', (err) => {
        console.log('SSH Client error:', err.message);
    });
});

const PORT = process.env.SSH_PORT || 2222;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SSH Honeypot listening on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down SSH honeypot...');
    server.close();
    socket.disconnect();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Shutting down SSH honeypot...');
    server.close();
    socket.disconnect();
    process.exit(0);
});
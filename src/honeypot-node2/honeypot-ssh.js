const { Server } = require('ssh2');
const fs = require('fs');
const crypto = require('crypto');
const { io } = require('socket.io-client');

// Socket connection
const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://collector-server:3000');

socket.on('connect', () => {
    console.log('SSH Honeypot connected to collector server');
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
        
        // Send via Socket.IO
        if (socket.connected) {
            socket.emit('honeypot_data', authData);
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

const axios = require('axios'); // require because CommonJS file

function calculateSeverity(ctx) {
    if (ctx.method === 'password' && ctx.username === 'root') {
        return 'high';
    }
    if (ctx.method === 'password') {
        return 'medium';
    }
    return 'low';
}

async function getGeoData(ip) {
    try {
        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        return {
            country: response.data.country_name || 'unknown',
            city: response.data.city || 'unknown',
            lat: response.data.latitude || null,
            lon: response.data.longitude || null
        };
    } catch (error) {
        console.error('Error fetching geo data:', error);
        return {
            country: 'unknown',
            city: 'unknown',
            lat: null,
            lon: null
        };
    }
}

async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip; 
    } catch (error) {
        console.error('Error fetching public IP:', error);
        return 'unknown';
    }
}
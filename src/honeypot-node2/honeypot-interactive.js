const { Server } = require('ssh2');
const crypto = require('crypto');
const { io } = require('socket.io-client');
const { getGeoData } = require('./utils/helpers.cjs');
const HONEYPOT_ID = 'node2';
const PORT = process.env.SSH_PORT || 2222;
let heartbeatInterval;

const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://localhost:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
});

socket.on('connect', () => {
    console.log('Honeypot Node 3 connected to collector');

    socket.emit('honeypot_status', {
        honeypotId: HONEYPOT_ID,
        status: 'online',
        port: PORT,
        timestamp: new Date().toISOString()
    });

    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    heartbeatInterval = setInterval(() => {
        socket.emit('honeypot_heartbeat', {
            honeypotId: HONEYPOT_ID,
            port: PORT,
            timestamp: new Date().toISOString()
        });
    }, 5000); // 5s
});

socket.on('disconnect', () => {
    console.log('Disconnected from collector - buffering mode activated | Heartbeat stopped');
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
});

// Generate a dummy SSH host key
const hostKey = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
});

// File System simulation
const fsState = {
    '/root': { type: 'dir', files: ['secret.txt', 'passwords.db'] },
    '/etc': { type: 'dir', files: ['passwd', 'shadow', 'hosts'] },
    '/var/log': { type: 'dir', files: ['syslog', 'auth.log'] }
};

let currentDir = '/root';

const server = new Server({
    hostKeys: [hostKey.privateKey]
}, (client) => {
    console.log('Client connected!');
    const clientIp = client._sock.remoteAddress || 'unknown';
    let stream;

    let geoData = null;

    client.on('authentication', async (ctx) => {
        console.log(`Auth attempt: ${ctx.method} user=${ctx.username} pass=${ctx.password}`);

        if (!geoData) {
            geoData = await getGeoData(clientIp);
        }

        socket.emit('honeypot_data', {
            honeypotId: HONEYPOT_ID,
            timestamp: new Date().toISOString(),
            sourceIp: clientIp,
            port: PORT,
            description: `Login attempt: ${ctx.username}/${ctx.password}`,
            severity: (ctx.username === 'root' && ctx.password === '123456') ? 'critical' : 'medium',
            geoData: geoData,
            type: 'login'
        });

        if (ctx.method === 'password' && ctx.username === 'root' && ctx.password === '123456') {
            ctx.accept();
        } else {
            ctx.reject();
        }
    });

    client.on('ready', () => {
        console.log('Client authenticated!');
        client.on('session', (accept, reject) => {
            const session = accept();
            session.on('pty', (accept, reject, info) => {
                accept();
            });
            session.on('shell', (accept, reject) => {
                stream = accept();
                const sessionId = crypto.randomUUID();
                console.log(`New session started: ${sessionId}`);

                const originalWrite = stream.write;
                stream.write = function (chunk, encoding, callback) {
                    socket.emit('session_data', {
                        honeypotId: HONEYPOT_ID,
                        sessionId: sessionId,
                        data: chunk.toString()
                    });
                    return originalWrite.apply(stream, arguments);
                };

                stream.write('Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-150-generic x86_64)\r\n\r\n');
                stream.write('root@server:~# ');

                let buffer = '';

                stream.on('data', (data) => {
                    const chunk = data.toString();

                    for (let i = 0; i < chunk.length; i++) {
                        const char = chunk[i];

                        if (char === '\r') {
                            stream.write('\r\n');
                            console.log(`[DEBUG] Raw buffer: ${JSON.stringify(buffer)}`);
                            handleCommand(buffer.trim(), stream, clientIp, geoData);
                            buffer = '';
                            stream.write(`root@server:${currentDir === '/root' ? '~' : currentDir}# `);
                        }
                        else if (char === '\u007f') {
                            if (buffer.length > 0) {
                                buffer = buffer.slice(0, -1);
                                stream.write('\b \b');
                            }
                        }
                        else if (char >= ' ' && char <= '~') {
                            buffer += char;
                            stream.write(char);
                        }
                    }
                });
            });
        });
    });

    client.on('end', () => {
        console.log('Client disconnected');
    });
});

function handleCommand(cmd, stream, clientIp, geoData) {
    const parts = cmd.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    socket.emit('honeypot_data', {
        honeypotId: HONEYPOT_ID,
        timestamp: new Date().toISOString(),
        sourceIp: clientIp || 'unknown',
        port: PORT,
        description: `Command executed: ${cmd}`,
        severity: 'low',
        geoData: geoData || { country: 'unknown', city: 'unknown' },
        type: 'command'
    });

    switch (command) {
        case 'ls':
            const dir = fsState[currentDir];
            if (dir) {
                stream.write(dir.files.join('  ') + '\r\n');
            }
            break;
        case 'pwd':
            stream.write(currentDir + '\r\n');
            break;
        case 'cd':
            const target = args[0];
            if (!target) {
                currentDir = '/root';
            } else if (target === '..') {
                currentDir = '/';
            } else if (fsState[target] || fsState[`${currentDir}/${target}`]) {
                currentDir = target.startsWith('/') ? target : `${currentDir}/${target}`;
            } else {
                stream.write(`bash: cd: ${target}: No such file or directory\r\n`);
            }
            break;
        case 'whoami':
            stream.write('root\r\n');
            break;
        case 'cat':
            stream.write('Permission denied (this is a honeypot, nice try!)\r\n');
            break;
        case 'exit':
            stream.exit(0);
            stream.end();
            break;
        case '':
            break;
        default:
            stream.write(`bash: ${command}: command not found\r\n`);
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Honeypot Node 3 listening on port ${PORT}`);
});

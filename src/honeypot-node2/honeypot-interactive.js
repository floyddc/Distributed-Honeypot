const { Server } = require('ssh2');
const crypto = require('crypto');
const { io } = require('socket.io-client');
const mqtt = require('mqtt');
const { getGeoData } = require('./utils/helpers.cjs');
const DataBuffer = require('./utils/buffer.cjs');

const HONEYPOT_ID = 'node2';
const PORT = process.env.SSH_PORT || 2222;
const buffer = new DataBuffer(100);
let heartbeatInterval = null;
let collectorOnline = false;

const socket = io(process.env.COLLECTOR_SERVER_URL || 'http://localhost:3000', {
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

  const statusMsg = {
    honeypotId: HONEYPOT_ID,
    status: 'online',
    port: PORT,
    timestamp: new Date().toISOString()
  };
  mqttClient.publish(`honeypot/${HONEYPOT_ID}/status`, JSON.stringify(statusMsg), { qos: 1, retain: true });

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      const hb = {
        honeypotId: HONEYPOT_ID,
        port: PORT,
        timestamp: new Date().toISOString(),
        status: 'online'
      };
      mqttClient.publish(`honeypot/${HONEYPOT_ID}/heartbeat`, JSON.stringify(hb), { qos: 1, retain: false });
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
  console.log('Honeypot Node 2 connected to collector server via Socket.IO');

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

        const attackPayload = {
            honeypotId: HONEYPOT_ID,
            timestamp: new Date().toISOString(),
            sourceIp: clientIp,
            port: PORT,
            description: `Login attempt: ${ctx.username}/${ctx.password}`,
            severity: (ctx.username === 'root' && ctx.password === '123456') ? 'critical' : 'medium',
            geoData: geoData,
            type: 'login'
        };

        if (socket && socket.connected && collectorOnline) {
            socket.emit('honeypot_data', attackPayload);
        } else {
            buffer.add(attackPayload);
            console.log(`[BUFFER] Buffered auth attempt. Buffer size: ${buffer.size()}`);
        }

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
                    const chunkPayload = {
                        honeypotId: HONEYPOT_ID,
                        sessionId: sessionId,
                        data: chunk.toString()
                    };

                    if (socket && socket.connected && collectorOnline) {
                        socket.emit('session_data', chunkPayload);
                    } else {
                        // not buffered
                    }

                    return originalWrite.apply(stream, arguments);
                };

                stream.write('Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-150-generic x86_64)\r\n\r\n');
                stream.write('root@server:~# ');

                let cmdBuffer = '';

                stream.on('data', (data) => {
                    const chunk = data.toString();

                    for (let i = 0; i < chunk.length; i++) {
                        const char = chunk[i];

                        if (char === '\r') {
                            stream.write('\r\n');
                            const command = cmdBuffer.trim();
                            if (command.length > 0) {
                                handleCommand(command, stream, clientIp, geoData);
                            }
                            cmdBuffer = '';
                            stream.write(`root@server:${currentDir === '/root' ? '~' : currentDir}# `);
                        }
                        else if (char === '\u007f') {
                            if (cmdBuffer.length > 0) {
                                cmdBuffer = cmdBuffer.slice(0, -1);
                                stream.write('\b \b');
                            }
                        }
                        else if (char >= ' ' && char <= '~') {
                            cmdBuffer += char;
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

    const attackPayload = {
        honeypotId: HONEYPOT_ID,
        timestamp: new Date().toISOString(),
        sourceIp: clientIp || 'unknown',
        port: PORT,
        description: `Command executed: ${cmd}`,
        severity: 'low',
        geoData: geoData || { country: 'unknown', city: 'unknown' },
        type: 'command'
    };

    if (socket && socket.connected && collectorOnline) {
        socket.emit('honeypot_data', attackPayload);
    } else {
        buffer.add(attackPayload);
        console.log(`[BUFFER] Buffered command "${cmd}". Buffer size: ${buffer.size()}`);
    }

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
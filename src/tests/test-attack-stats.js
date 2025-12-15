const { Client } = require('ssh2');
const { io } = require('socket.io-client');
const axios = require('axios');
const mqtt = require('mqtt');
const { TestRunner, assert, assertEquals } = require('./utils/test-helpers');
const chalk = require('chalk');
const runner = new TestRunner('Attack Statistics Tests');

let collectorSocket;
let capturedAttacks = [];
let authToken = '';

async function login() {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@gmail.com',
            password: 'admin'
        });
        authToken = response.data.token;
        console.log('   Authenticated as admin');
    } catch (error) {
        console.error('Error logging in:', error.message);
    }
}

async function fetchAttacks() {
    try {
        const response = await axios.get('http://localhost:3000/api/admin/attacks', {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching attacks:', error.message);
        return [];
    }
}

async function publishCollectorOnline() {
    const payload = JSON.stringify({ collectorStatus: 'online' });
    const targets = ['mqtt://mosquitto:1883', 'mqtt://localhost:1883'];
    for (const url of targets) {
        try {
            await new Promise((resolve, reject) => {
                const client = mqtt.connect(url, { connectTimeout: 2000, reconnectPeriod: 0 });
                const t = setTimeout(() => {
                    client.end(true);
                    reject(new Error('connect timeout'));
                }, 2000);
                client.on('connect', () => {
                    clearTimeout(t);
                    client.publish(`honeypot/node2/collector_status`, payload, { qos: 1 }, () => {
                        client.end();
                        resolve();
                    });
                });
                client.on('error', (err) => {
                    clearTimeout(t);
                    client.end(true);
                    reject(err);
                });
            });
            console.log(`   Published collector_status to ${url}`);
            return true;
        } catch (e) {
            console.log(`   MQTT publish to ${url} failed: ${e.message}`);
        }
    }
    console.log('   Could not publish collector_status to any MQTT broker');
    return false;
}

runner.test('Connect to Collector Server', async () => {
    return new Promise((resolve, reject) => {
        collectorSocket = io('http://localhost:3000');

        collectorSocket.on('connect', () => {
            console.log('   Connected to collector server');
            resolve();
        });

        collectorSocket.on('new_attack', (data) => {
            console.log('   Received attack event:', data.description);
            capturedAttacks.push(data);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
});

runner.test('Verify Attack Persistence', async () => {
    await login();

    const initialAttacks = await fetchAttacks();
    const initialCount = initialAttacks.length;
    console.log(`   Initial DB count: ${initialCount}`);

    console.log('   Performing SSH login attempt...');
    await new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.end();
            resolve();
        }).on('error', () => {
            resolve();
        }).connect({
            host: 'localhost',
            port: 2222,
            username: 'stats_tester',
            password: 'password123',
            readyTimeout: 5000
        });
    });

    await publishCollectorOnline();

    console.log('   Waiting for processing...');
    await new Promise(r => setTimeout(r, 2000));

    const eventAttack = capturedAttacks.find(a => a.description.includes('stats_tester'));
    if (eventAttack) {
        assertEquals(eventAttack.type, 'login', 'Event type should be login');
    } else {
        console.log('   No WebSocket event received — will verify persistence via API/DB fallback');
    }

    const finalAttacks = await fetchAttacks();
    const finalCount = finalAttacks.length;
    console.log(`   Final DB count: ${finalCount}`);

    assert(finalCount > initialCount, 'Database attack count should increase');

    const dbAttack = finalAttacks.find(a => a.description.includes('stats_tester'));
    assert(dbAttack, 'Attack should be found in database via API');
    assertEquals(dbAttack.severity, 'medium', 'Severity should be medium for failed login');

    console.log('   Attack successfully persisted and retrieved!');
});

(async () => {
    try {
        await runner.run();
        console.log(chalk.green('\nATTACK STATS TESTS PASSED!'));
        if (collectorSocket) collectorSocket.disconnect();
    } catch (error) {
        console.error(chalk.red('\nTESTS FAILED:'), error);
        if (collectorSocket) collectorSocket.disconnect();
        process.exit(1);
    }
})();

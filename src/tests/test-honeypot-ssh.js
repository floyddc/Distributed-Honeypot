const { Client } = require('ssh2');
const { io } = require('socket.io-client');
const mqtt = require('mqtt');
const { TestRunner, assert, assertEquals } = require('./utils/test-helpers');
const chalk = require('chalk');
const runner = new TestRunner('SSH Honeypot Tests');

let collectorSocket;
let capturedData = [];

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

        collectorSocket.on('connect_error', (error) => {
            reject(new Error(`Failed to connect to collector: ${error.message}`));
        });

        collectorSocket.on('new_attack', (data) => {
            console.log('   Received attack data:', data);
            if (data.type === 'login' || data.attackType === 'ssh_connection') {
                capturedData.push(data);
                console.log('   SSH attack captured - test will complete!');
            }
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
});

runner.test('Single SSH authentication attempt', async () => {
    const initialDataLength = capturedData.length;
    console.log(`   Initial SSH attacks: ${initialDataLength}`);

    const sshAttackPromise = new Promise((resolve) => {
        const checkForAttack = () => {
            if (capturedData.length > initialDataLength) {
                resolve();
            } else {
                setTimeout(checkForAttack, 100);
            }
        };
        checkForAttack();
    });

    console.log('   Attempting SSH login...');

    const sshPromise = new Promise((resolve) => {
        const conn = new Client();

        conn.on('error', (err) => {
            console.log(`   SSH Error (expected): ${err.code || err.message}`);
            resolve();
        });

        conn.on('close', () => {
            console.log('   SSH Connection closed');
            resolve();
        });

        conn.connect({
            host: 'localhost',
            port: 2222,
            username: 'admin',
            password: 'password123',
            readyTimeout: 3000
        });

        setTimeout(() => {
            console.log('   SSH Timeout');
            resolve();
        }, 5000);
    });

    await publishCollectorOnline();

    console.log('   Waiting for SSH attack to be captured...');

    await Promise.race([
        Promise.all([sshPromise, sshAttackPromise]),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout waiting for SSH attack')), 8000)
        )
    ]);

    console.log(`   Final SSH attacks: ${capturedData.length}`);

    assert(capturedData.length > initialDataLength, 'SSH attack should have been captured');

    const lastAttack = capturedData[capturedData.length - 1];
    assertEquals(lastAttack.honeypotId, 'node2', 'SSH Honeypot ID should be node2');
    assertEquals(lastAttack.type, 'login', 'Attack type should be login');

    assert(lastAttack.description.includes('admin'), 'Description should contain username admin');
    assert(lastAttack.description.includes('password123'), 'Description should contain password');

    console.log('   Single SSH attack successfully captured and verified!');
});

(async () => {
    try {
        await runner.run();

        console.log(chalk.green('\nSSH HONEYPOT TESTS COMPLETED SUCCESSFULLY!'));
        console.log(chalk.blue(`Total SSH attacks captured: ${capturedData.length}`));
        console.log(chalk.gray('='.repeat(60)));

        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('Disconnected from collector server'));
        }

        console.log(chalk.green('SSH test finished successfully.'));

    } catch (error) {
        console.error(chalk.red('\nSSH TEST FAILED:'), error);

        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('Disconnected from collector server (after error)'));
        }

        console.log(chalk.red('SSH test failed.'));
        process.exit(1);
    }
})();
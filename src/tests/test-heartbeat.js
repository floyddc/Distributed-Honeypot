const { io } = require('socket.io-client');
const { TestRunner, assert, assertEquals } = require('./utils/test-helpers');
const chalk = require('chalk');

const runner = new TestRunner('Heartbeat Tests');

let collectorSocket;
let statusChanges = [];

runner.test('Connect to Collector Server', async () => {
    return new Promise((resolve, reject) => {
        collectorSocket = io('http://localhost:3000');

        collectorSocket.on('connect', () => {
            console.log('Connected to collector server');
            resolve();
        });

        collectorSocket.on('connect_error', (error) => {
            reject(new Error(`Failed to connect to collector: ${error.message}`));
        });

        collectorSocket.on('honeypot_status_change', (data) => {
            console.log('   Status change received:', data);
            statusChanges.push(data);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
});

runner.test('Wait for honeypot status changes (15 seconds)', async () => {
    console.log('   Waiting for honeypots to send their initial status...');

    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`   Total status changes received: ${statusChanges.length}`);
            resolve();
        }, 15000);
    });
});

runner.test('Verify all honeypots are online', async () => {
    console.log('   Checking honeypot statuses...');

    assert(statusChanges.length >= 3, `Expected at least 3 status changes, got ${statusChanges.length}`);

    const expectedHoneypots = ['node1', 'node2', 'node3'];
    const onlineHoneypots = statusChanges
        .filter(s => s.status === 'online')
        .map(s => s.honeypotId);

    console.log('   Online honeypots:', onlineHoneypots);

    for (const nodeId of expectedHoneypots) {
        assert(
            onlineHoneypots.includes(nodeId),
            `Honeypot ${nodeId} should be online`
        );
        console.log(`   ${nodeId} is online`);
    }

    // Verifica le porte
    const node1 = statusChanges.find(s => s.honeypotId === 'node1');
    const node2 = statusChanges.find(s => s.honeypotId === 'node2');
    const node3 = statusChanges.find(s => s.honeypotId === 'node3');

    if (node1) assertEquals(node1.port, 3001, 'Node1 port should be 3001');
    if (node2) assertEquals(node2.port, 2222, 'Node2 port should be 2222');
    if (node3) assertEquals(node3.port, 3003, 'Node3 port should be 3003');

    console.log('   All honeypots are online with correct ports');
});

runner.test('Monitor heartbeats for 20 seconds', async () => {
    console.log('   Monitoring heartbeats...');

    return new Promise((resolve) => {
        let heartbeatCount = statusChanges.length;

        const interval = setInterval(() => {
            if (statusChanges.length > heartbeatCount) {
                console.log(`   Heartbeat activity detected (${statusChanges.length - heartbeatCount} new events)`);
                heartbeatCount = statusChanges.length;
            }
        }, 5000);

        setTimeout(() => {
            clearInterval(interval);
            console.log(`   Monitoring complete. Total events: ${statusChanges.length}`);
            resolve();
        }, 20000);
    });
});

runner.test('Test offline detection (stop one honeypot)', async () => {
    console.log('   Testing offline detection...');
    console.log('   Note: This test requires manually stopping one honeypot');
    console.log('   You can stop node3 with: docker stop honeypot-node3');
    console.log('   Waiting 20 seconds for offline detection...');

    const initialOffline = statusChanges.filter(s => s.status === 'offline').length;

    return new Promise((resolve) => {
        setTimeout(() => {
            const currentOffline = statusChanges.filter(s => s.status === 'offline').length;

            if (currentOffline > initialOffline) {
                console.log('   Offline detection working! A honeypot went offline');

                const offlineNode = statusChanges
                    .reverse()
                    .find(s => s.status === 'offline');

                if (offlineNode) {
                    console.log(`   Offline honeypot: ${offlineNode.honeypotId}`);
                }
            } else {
                console.log('   No honeypots went offline during test (this is OK)');
            }

            resolve();
        }, 20000);
    });
});

(async () => {
    try {
        console.log(chalk.cyan('Starting Heartbeat Tests...'));
        console.log(chalk.gray('Make sure all honeypot nodes are running!'));
        console.log(chalk.gray('='.repeat(60)));

        await runner.run();

        console.log(chalk.green('\nHEARTBEAT TESTS COMPLETED!'));
        console.log(chalk.blue(`Total status changes captured: ${statusChanges.length}`));
        console.log(chalk.blue(`Honeypots detected:`));

        const uniqueHoneypots = [...new Set(statusChanges.map(s => s.honeypotId))];
        uniqueHoneypots.forEach(id => {
            const lastStatus = [...statusChanges]
                .reverse()
                .find(s => s.honeypotId === id);
            console.log(chalk.blue(`   - ${id}: ${lastStatus?.status || 'unknown'}`));
        });

        console.log(chalk.gray('='.repeat(60)));

        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('Disconnected from collector server'));
        }

        console.log(chalk.green('Test finished successfully.'));
        process.exit(0);

    } catch (error) {
        console.error(chalk.red('\nHEARTBEAT TEST FAILED:'), error);

        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('Disconnected from collector server (after error)'));
        }

        console.log(chalk.red('Test failed.'));
        process.exit(1);
    }
})();
const { io } = require('socket.io-client');
const axios = require('axios');
const { TestRunner, assert, assertEquals } = require('./utils/test-helpers');
const chalk = require('chalk');
const runner = new TestRunner('Heartbeat Tests');

let collectorSocket;
let statusChanges = [];

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

        collectorSocket.on('honeypot_status_change', (data) => {
            console.log('   Status change received:', data);
            statusChanges.push(data);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
});

runner.test('Verify all honeypots are online via API', async () => {
    console.log('   Fetching honeypot statuses from API...');

    const response = await axios.get('http://localhost:3000/api/honeypots');
    const honeypots = response.data;

    console.log(`   Found ${honeypots.length} honeypots`);

    assert(honeypots.length >= 3, 
        `Expected at least 3 honeypots, got ${honeypots.length}`);

    const expectedHoneypots = [
        { id: 'node1', port: 3001 },
        { id: 'node2', port: 2222 },
        { id: 'node3', port: 3003 }
    ];

    for (const expected of expectedHoneypots) {
        const honeypot = honeypots.find(h => h.honeypotId === expected.id);
        
        assert(honeypot, `Honeypot ${expected.id} should exist`);
        assertEquals(honeypot.status, 'online', 
            `${expected.id} should be online`);
        assertEquals(honeypot.port, expected.port, 
            `${expected.id} should be on port ${expected.port}`);
        
        console.log(`   ${expected.id}: online on port ${expected.port}`);
    }
});

runner.test('Monitor real-time status changes (30 seconds)', async () => {
    console.log('   Listening for real-time status changes...');
    console.log('   (Restart a honeypot to see events)');

    return new Promise((resolve) => {
        const initialCount = statusChanges.length;
        
        const interval = setInterval(() => {
            if (statusChanges.length > initialCount) {
                const newEvents = statusChanges.length - initialCount;
                console.log(`   Received ${newEvents} status change events`);
            }
        }, 5000);

        setTimeout(() => {
            clearInterval(interval);
            
            if (statusChanges.length > initialCount) {
                console.log(`   Status change detection working!`);
            } else {
                console.log(`   No status changes detected (this is OK if nodes didn't restart)`);
            }
            
            resolve();
        }, 30000);
    });
});

runner.test('Verify heartbeat mechanism', async () => {
    console.log('   Checking last heartbeat times...');

    const response = await axios.get('http://localhost:3000/api/honeypots');
    const honeypots = response.data;

    const now = new Date();
    
    for (const honeypot of honeypots) {
        const lastSeen = new Date(honeypot.lastSeen);
        const timeDiff = (now - lastSeen) / 1000; 
        
        assert(timeDiff < 15, 
            `${honeypot.honeypotId} last seen ${timeDiff}s ago (should be < 15s)`);
        
        console.log(`   ${honeypot.honeypotId}: last seen ${timeDiff.toFixed(1)}s ago`);
    }
    
    console.log('   All honeypots are sending heartbeats');
});

(async () => {
    try {
        console.log(chalk.cyan('Starting Heartbeat Tests...'));
        console.log(chalk.gray('Make sure all honeypot nodes are running!'));
        console.log(chalk.gray('='.repeat(60)));

        await runner.run();

        console.log(chalk.green('\n✅ HEARTBEAT TESTS COMPLETED!'));
        
        const response = await axios.get('http://localhost:3000/api/honeypots');
        console.log(chalk.blue(`\nHoneypots status:`));
        
        response.data.forEach(hp => {
            const lastSeen = new Date(hp.lastSeen);
            const timeDiff = ((new Date() - lastSeen) / 1000).toFixed(1);
            console.log(chalk.blue(`   - ${hp.honeypotId}: ${hp.status} (last seen ${timeDiff}s ago)`));
        });

        console.log(chalk.gray('='.repeat(60)));

        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('Disconnected from collector server'));
        }

        console.log(chalk.green('Test finished successfully.'));
        process.exit(0);

    } catch (error) {
        console.error(chalk.red('\nHEARTBEAT TEST FAILED:'), error.message);

        if (collectorSocket) {
            collectorSocket.disconnect();
        }

        process.exit(1);
    }
})();
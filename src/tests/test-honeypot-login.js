const puppeteer = require('puppeteer');
const { io } = require('socket.io-client');
const { TestRunner, assert, assertEquals } = require('./utils/test-helpers');
const chalk = require('chalk');

const runner = new TestRunner('Login Honeypot Tests');

let collectorSocket;
let capturedData = [];

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
            console.log('   📡 Received attack data:', data);
            if (data.attackType === 'login_attempt') {  
                capturedData.push(data);
                console.log('   ✅ Login attack captured - test will complete!');
            }
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
});

runner.test('Single login authentication attempt', async () => {  
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const initialDataLength = capturedData.length;
        console.log(`   📊 Initial login attacks: ${initialDataLength}`);
        
        const loginAttackPromise = new Promise((resolve) => {
            const checkForAttack = () => {
                if (capturedData.length > initialDataLength) {
                    resolve();
                } else {
                    setTimeout(checkForAttack, 100);
                }
            };
            checkForAttack();
        });
        
        console.log('   🌐 Opening honeypot page...');
        const page = await browser.newPage();
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
        
        console.log('   🔐 Attempting login...');
        await page.type('input[type="text"]', 'admin');
        await page.type('input[type="password"]', 'password123');
        
        // Login attempt promise
        const loginPromise = new Promise(async (resolve) => {
            await page.click('button[type="submit"]');
            console.log('   🚀 Form submitted');
            resolve();
        });
        
        console.log('   ⏳ Waiting for login attack to be captured...');
        
        await Promise.race([
            Promise.all([loginPromise, loginAttackPromise]),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout waiting for login attack')), 8000)
            )
        ]);
        
        console.log(`   📊 Final login attacks: ${capturedData.length}`);
        
        assert(capturedData.length > initialDataLength, 'Login attack should have been captured');
        
        const lastAttack = capturedData[capturedData.length - 1];
        assertEquals(lastAttack.honeypotId, 'node1', 'Login Honeypot ID should be node1');
        assertEquals(lastAttack.attackType, 'login_attempt', 'Attack type should be login_attempt');
        assertEquals(lastAttack.username, 'admin', 'Username should be admin');
        assertEquals(lastAttack.password, 'password123', 'Password should be password123');
        
        console.log('   ✅ Single login attack successfully captured and verified!');
        
    } finally {
        await browser.close();
        console.log('   🔒 Browser closed');
    }
});

(async () => {
    try {
        await runner.run();
        
        console.log(chalk.green('\n🎉 LOGIN HONEYPOT TESTS COMPLETED SUCCESSFULLY!'));
        console.log(chalk.blue(`📊 Total login attacks captured: ${capturedData.length}`));
        console.log(chalk.gray('='.repeat(60)));
        
        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('🔌 Disconnected from collector server'));
        }
        
        console.log(chalk.green('✅ Login test finished successfully.'));
        
    } catch (error) {
        console.error(chalk.red('\n💥 LOGIN TEST FAILED:'), error);
        
        if (collectorSocket) {
            collectorSocket.disconnect();
            console.log(chalk.yellow('🔌 Disconnected from collector server (after error)'));
        }
        
        console.log(chalk.red('❌ Login test failed.'));
        process.exit(1);
    }
})();
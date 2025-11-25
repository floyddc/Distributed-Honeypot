const chalk = require('chalk');

class TestRunner {
    constructor(testName) {
        this.testName = testName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, testFn) {
        this.tests.push({ description, testFn });
    }

    async run() {
        console.log(chalk.blue(`\n🧪 Running ${this.testName}`));
        console.log(chalk.gray('='.repeat(50)));

        for (const { description, testFn } of this.tests) {
            try {
                console.log(chalk.yellow(`⏳ ${description}`));
                await testFn();
                console.log(chalk.green(`✅ ${description}`));
                this.passed++;
            } catch (error) {
                console.log(chalk.red(`❌ ${description}`));
                console.log(chalk.red(`   Error: ${error.message}`));
                this.failed++;
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log(chalk.gray('='.repeat(50)));
        console.log(chalk.blue(`📊 ${this.testName} Results:`));
        console.log(chalk.green(`✅ Passed: ${this.passed}`));
        console.log(chalk.red(`❌ Failed: ${this.failed}`));
        console.log(chalk.blue(`📈 Total: ${this.tests.length}`));
        
        if (this.failed > 0) {
            process.exit(1);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
    }
}

module.exports = { TestRunner, assert, assertEquals };
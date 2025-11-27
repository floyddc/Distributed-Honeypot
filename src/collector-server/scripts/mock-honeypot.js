const io = require('socket.io-client');

const socket = io('http://localhost:3000');

const generateRandomIP = () => {
    return Array(4).fill(0).map((_, i) => Math.floor(Math.random() * 255)).join('.');
};

const generateRandomPort = () => {
    const ports = [22, 80, 443, 3306, 5432, 8080, 21, 23];
    return ports[Math.floor(Math.random() * ports.length)];
};

const generateRandomCountry = () => {
    const countries = ['USA', 'China', 'Russia', 'Germany', 'Brazil', 'India', 'France'];
    return countries[Math.floor(Math.random() * countries.length)];
};

const generateSeverity = () => {
    const severities = ['low', 'medium', 'high', 'critical'];
    return severities[Math.floor(Math.random() * severities.length)];
};

const generateRandomProtocol = () => {
    const protocols = ['TCP', 'UDP', 'ICMP'];
    return protocols[Math.floor(Math.random() * protocols.length)];
};

let intervalId;

function startSimulation() {
    if (intervalId) return; // Already running

    intervalId = setInterval(() => {
        const attack = {
            sourceIp: generateRandomIP(),
            destinationPort: generateRandomPort(),
            protocol: generateRandomProtocol(),
            severity: generateSeverity(),
            timestamp: new Date(),
            geoData: {
                country: generateRandomCountry()
            }
        };
        console.log('Sending attack:', attack.sourceIp);
        socket.emit('honeypot_data', attack);
    }, 2000); // Send attack every 2 seconds
}

function stopSimulation() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

const HONEYPOT_ID = process.argv[2] || 'all'; // Pass ID as argument or default to 'all' (which effectively means it listens to everything if we don't filter properly, but let's filter)

socket.on('connect', () => {
    console.log(`Mock Honeypot (${HONEYPOT_ID}) Connected to Collector`);
    startSimulation();
});

socket.on('admin_command', (data) => {
    console.log('Received admin command:', data);

    // Check if command is for this honeypot or for all
    if (data.target === 'all' || data.target === HONEYPOT_ID) {
        if (data.command === 'stop') {
            console.log(`Stopping simulation for ${HONEYPOT_ID}...`);
            stopSimulation();
        } else if (data.command === 'start') {
            console.log(`Starting simulation for ${HONEYPOT_ID}...`);
            startSimulation();
        }
    }
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    stopSimulation();
});

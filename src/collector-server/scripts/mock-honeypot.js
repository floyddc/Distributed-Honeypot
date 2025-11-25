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

socket.on('connect', () => {
    console.log('Mock Honeypot Connected to Collector');

    setInterval(() => {
        const attackData = {
            sourceIp: generateRandomIP(),
            destinationPort: generateRandomPort(),
            protocol: 'TCP',
            severity: generateSeverity(),
            timestamp: new Date(),
            geoData: {
                country: generateRandomCountry()
            }
        };

        console.log('Sending attack:', attackData.sourceIp);
        // In a real scenario, this would be a specific event for honeypots
        // For now, we emit 'new_attack' directly or via a specific channel if implemented
        // Let's assume the server listens to 'honeypot_data' and broadcasts 'new_attack'
        socket.emit('honeypot_data', attackData);
    }, 2000); // Send attack every 2 seconds
});

socket.on('disconnect', () => {
    console.log('Disconnected from Collector');
});

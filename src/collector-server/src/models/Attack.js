const mongoose = require('mongoose');

const attackSchema = new mongoose.Schema({
    honeypotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Honeypot',
        required: true
    },
    sourceIp: {
        type: String,
        required: true
    },
    destinationPort: {
        type: Number,
        required: true
    },
    protocol: {
        type: String // TCP, UDP, ICMP
    },
    payload: {
        type: String
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    geoData: {
        country: String,
        city: String,
        lat: Number,
        lon: Number
    }
});

module.exports = mongoose.model('Attack', attackSchema);

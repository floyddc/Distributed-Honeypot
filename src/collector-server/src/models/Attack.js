const mongoose = require('mongoose');

const attackSchema = new mongoose.Schema({
    honeypotId: {
        type: String,
        required: true
    },
    port: {
        type: Number,
        required: true
    },
    sourceIp: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'critical'],
        default: 'low'
    },
    description: {
        type: String
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

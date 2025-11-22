const mongoose = require('mongoose');

const honeypotSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    apiKey: {
        type: String,
        required: true,
        unique: true
    },
    ipAddress: {
        type: String
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    lastSeen: {
        type: Date
    },
    location: {
        type: String // Could be "London, UK" or GeoJSON
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Honeypot', honeypotSchema);

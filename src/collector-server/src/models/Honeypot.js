const mongoose = require('mongoose');

const honeypotSchema = new mongoose.Schema({
    honeypotId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'faulty'],
        default: 'offline'
    },
    port: {
        type: Number,
        required: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        default: ''
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Honeypot', honeypotSchema);

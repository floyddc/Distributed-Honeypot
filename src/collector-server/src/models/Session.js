const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    honeypotId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['ssh', 'login'],
        required: true
    },
    buffer: {
        type: String,
        default: ''
    },
    events: {
        type: Array,
        default: []
    },
    fields: {
        username: { type: String, default: '' },
        password: { type: String, default: '' }
    },
    mouseX: {
        type: Number,
        default: 0
    },
    mouseY: {
        type: Number,
        default: 0
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true
    },
    endTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active',
        index: true
    }
}, {
    timestamps: true
});

// Efficient queries
SessionSchema.index({ status: 1, lastActivity: -1 });
SessionSchema.index({ honeypotId: 1, status: 1 });

SessionSchema.index({ lastActivity: 1 }, { 
    expireAfterSeconds: 86400, // 24h
    partialFilterExpression: { status: 'ended' }
});

module.exports = mongoose.model('Session', SessionSchema);
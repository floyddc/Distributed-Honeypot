const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    honeypotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Honeypot',
        required: true
    },
    rawContent: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);

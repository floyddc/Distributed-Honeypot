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
    description: {
        type: String,
        default: ''
    }
}, { 
    timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

module.exports = mongoose.model('Honeypot', honeypotSchema);

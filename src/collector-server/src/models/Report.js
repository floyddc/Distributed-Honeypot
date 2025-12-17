const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    honeypotId: { 
        type: String, 
        required: true 
    },
    port: { 
        type: Number, 
        required: true 
    },
    reporterId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    reporterUsername: { 
        type: String, 
        default: null 
    },
    message: { 
        type: String, 
        default: '' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now }
});

ReportSchema.index({ honeypotId: 1, createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
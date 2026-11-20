const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isGroup: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        default: ''
    },
    lastMessage: {
        body: { type: String, default: '' },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date }
    }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ isGroup: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    sentRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    receivedRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    bio: {
        type: String,
        default: '',
        maxlength: 300
    },

    profilePicture: {
        type: String,
        default: ''
    }
}, { timestamps: true });
const User = mongoose.model("User", userSchema);
module.exports = User;

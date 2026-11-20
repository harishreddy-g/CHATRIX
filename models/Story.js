const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    media: {
        type: String,
        default: ""
    },
    text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500
    },
    background: {
        type: String,
        default: ""
    },
    views: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model("Story", storySchema);
module.exports = Story;

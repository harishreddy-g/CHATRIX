const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    caption: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2200
    },
    images: [{
        type: String
    }],
    type: {
        type: String,
        enum: ["post", "video"],
        default: "post"
    },
    mediaUrl: {
        type: String,
        default: "",
        trim: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

postSchema.virtual("comments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "post",
    options: { sort: { createdAt: 1 } }
});

postSchema.set("toObject", { virtuals: true });
postSchema.set("toJSON", { virtuals: true });

const Post = mongoose.model("Post", postSchema);
module.exports = Post;

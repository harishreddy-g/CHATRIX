const fs = require("fs");
const path = require("path");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/Users");

const redirectWithMessage = (res, base, key, message) =>
    res.redirect(`${base}?${key}=${encodeURIComponent(message)}`);

exports.createPost = async (req, res) => {
    try {
        const { caption, type, mediaUrl } = req.body;
        const cleanCaption = (caption || "").trim();
        const cleanMedia = (mediaUrl || "").trim();
        const normalizedType = type === "video" ? "video" : "post";

        const images = (req.files || []).map((file) => `/uploads/posts/${file.filename}`);

        if (!cleanCaption && images.length === 0 && !cleanMedia) {
            (req.files || []).forEach((file) => fs.promises.unlink(file.path).catch(() => {}));
            return redirectWithMessage(res, "/dashboard", "error", "Add a caption, photo, or video link.");
        }

        await Post.create({
            author: req.user.userId,
            caption: cleanCaption,
            images,
            type: normalizedType,
            mediaUrl: cleanMedia
        });

        return redirectWithMessage(res, "/dashboard", "success", "Your post was shared.");
    } catch (error) {
        console.error("Create post error:", error.message);
        return redirectWithMessage(res, "/dashboard", "error", "Unable to share post. Please try again.");
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const userId = req.user.userId;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ ok: false, error: "Post not found" });

        const alreadyLiked = post.likes.some((id) => id.toString() === userId.toString());
        if (alreadyLiked) {
            post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
        } else {
            post.likes.push(userId);
        }
        await post.save();

        res.json({ ok: true, liked: !alreadyLiked, likeCount: post.likes.length });
    } catch (error) {
        console.error("Toggle like error:", error.message);
        res.status(500).json({ ok: false, error: "Unable to update like." });
    }
};

exports.addComment = async (req, res) => {
    try {
        const body = (req.body.body || "").trim();
        if (!body) return res.status(400).json({ ok: false, error: "Comment cannot be empty." });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ ok: false, error: "Post not found" });

        const comment = await Comment.create({
            post: post._id,
            author: req.user.userId,
            body
        });

        const author = await User.findById(req.user.userId).select("username profilePicture").lean();

        res.json({
            ok: true,
            comment: {
                _id: comment._id,
                body: comment.body,
                createdAt: comment.createdAt,
                author: {
                    _id: author._id,
                    username: author.username,
                    profilePicture: author.profilePicture || ""
                }
            }
        });
    } catch (error) {
        console.error("Add comment error:", error.message);
        res.status(500).json({ ok: false, error: "Unable to add comment." });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return redirectWithMessage(res, "/dashboard", "error", "Post not found.");
        if (post.author.toString() !== req.user.userId.toString()) {
            return redirectWithMessage(res, "/dashboard", "error", "You can only delete your own posts.");
        }

        post.images.forEach((src) => {
            const filename = path.basename(src);
            fs.promises.unlink(path.join(__dirname, "../public/uploads/posts", filename)).catch(() => {});
        });

        await Comment.deleteMany({ post: post._id });
        await post.deleteOne();

        return redirectWithMessage(res, "/dashboard", "success", "Post deleted.");
    } catch (error) {
        console.error("Delete post error:", error.message);
        return redirectWithMessage(res, "/dashboard", "error", "Unable to delete post.");
    }
};

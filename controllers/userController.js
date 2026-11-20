const bcrypt = require("bcrypt");
const User = require("../models/Users");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { fetchStoryFeed } = require("./storyController");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFeedPosts = async (postDocs, currentUserId) => {
    const ids = postDocs.map((post) => post._id);
    let countMap = new Map();
    if (ids.length) {
        const counts = await Comment.aggregate([
            { $match: { post: { $in: ids } } },
            { $group: { _id: "$post", count: { $sum: 1 } } }
        ]);
        countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    }

    return postDocs.map((post) => ({
        _id: post._id,
        caption: post.caption,
        images: post.images || [],
        type: post.type,
        mediaUrl: post.mediaUrl || "",
        createdAt: post.createdAt,
        author: post.author,
        likeCount: (post.likes || []).length,
        liked: (post.likes || []).some((id) => id.toString() === currentUserId.toString()),
        commentCount: countMap.get(post._id.toString()) || 0
    }));
};

const buildProfileData = async (targetId, currentUserId) => {
    const target = await User.findById(targetId).select("-password").lean();
    if (!target) return null;

    const postDocs = await Post.find({ author: targetId })
        .populate("author", "username profilePicture")
        .sort({ createdAt: -1 })
        .lean();
    const posts = await buildFeedPosts(postDocs, currentUserId);

    const gallery = [];
    posts.forEach((post) => (post.images || []).forEach((src) => gallery.push({ src, postId: post._id })));

    return {
        _id: target._id,
        username: target.username,
        email: target.email,
        bio: target.bio || "",
        profilePicture: target.profilePicture || "",
        friendsCount: (target.friends || []).length,
        followingCount: (target.following || []).length,
        followersCount: (target.followers || []).length,
        postsCount: posts.length,
        memberSince: target.createdAt,
        isOwn: targetId.toString() === currentUserId.toString(),
        isFollowing: (target.followers || []).some((id) => id.toString() === currentUserId.toString()),
        posts,
        gallery
    };
};

exports.renderDashboard = async (req, res) => {
    try {
        const searchTerm = (req.query.search || req.query.q || "").trim();
        const currentUserId = req.user.userId;
        const user = await User.findById(currentUserId)
            .select("username email profilePicture friends receivedRequests sentRequests following followers")
            .populate("friends", "username email profilePicture")
            .populate("receivedRequests", "username email profilePicture")
            .populate("sentRequests", "username email profilePicture")
            .lean();

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        let searchResults = [];
        let friendResults = [];
        if (searchTerm) {
            const searchRegex = new RegExp(escapeRegex(searchTerm), "i");
            friendResults = (user.friends || []).filter((friend) =>
                searchRegex.test(friend.username) || searchRegex.test(friend.email)
            );

            const candidates = await User.find({
                _id: { $ne: currentUserId },
                $or: [{ username: searchRegex }, { email: searchRegex }]
            })
                .select("username email profilePicture followers")
                .limit(12)
                .lean();

            const excludedIds = new Set([
                ...user.friends.map((friend) => friend._id.toString()),
                ...user.receivedRequests.map((request) => request._id.toString()),
                ...user.sentRequests.map((request) => request._id.toString())
            ]);

            searchResults = candidates
                .filter((candidate) => !excludedIds.has(candidate._id.toString()))
                .map((candidate) => ({
                    _id: candidate._id,
                    username: candidate.username,
                    email: candidate.email,
                    profilePicture: candidate.profilePicture || "",
                    isFollowing: (candidate.followers || []).some((id) => id.toString() === currentUserId.toString())
                }));
        }

        const stories = await fetchStoryFeed(currentUserId);

        const authorIds = [
            ...(user.following || []).map((id) => id.toString()),
            currentUserId.toString()
        ];

        const postDocs = await Post.find({ author: { $in: authorIds } })
            .populate("author", "username profilePicture")
            .sort({ createdAt: -1 })
            .limit(25)
            .lean();

        const feed = await buildFeedPosts(postDocs, currentUserId);

        res.render("dashboard", {
            currentUser: {
                _id: user._id,
                username: user.username,
                profilePicture: user.profilePicture || ""
            },
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture || "",
            friendsCount: user.friends.length,
            friends: user.friends,
            followingCount: (user.following || []).length,
            followersCount: (user.followers || []).length,
            pendingRequestsCount: user.receivedRequests.length,
            receivedRequests: user.receivedRequests,
            sentRequests: user.sentRequests,
            searchQuery: searchTerm,
            searchResults,
            friendResults,
            stories,
            feed,
            successMessage: req.query.success ? decodeURIComponent(req.query.success) : "",
            errorMessage: req.query.error ? decodeURIComponent(req.query.error) : ""
        });
    } catch (error) {
        console.error("Dashboard error:", error.message);
        res.status(500).send("Unable to load dashboard.");
    }
};

exports.renderProfile = async (req, res) => {
    try {
        const profile = await buildProfileData(req.user.userId, req.user.userId);
        if (!profile) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        res.render("profile", {
            profile,
            currentUser: { _id: req.user.userId },
            successMessage: req.query.updated === "1" ? "Profile updated successfully." : ""
        });
    } catch (error) {
        console.error("Profile error:", error.message);
        res.status(500).send("Unable to load profile.");
    }
};

exports.renderUserProfile = async (req, res) => {
    try {
        const profile = await buildProfileData(req.params.id, req.user.userId);
        if (!profile) return res.status(404).send("User not found.");

        res.render("profile", {
            profile,
            currentUser: { _id: req.user.userId },
            successMessage: ""
        });
    } catch (error) {
        console.error("User profile error:", error.message);
        res.status(500).send("Unable to load profile.");
    }
};

exports.renderProfileEdit = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("username email bio")
            .lean();

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        res.render("profile-edit", {
            profile: {
                username: user.username,
                email: user.email,
                bio: user.bio || ""
            },
            errorMessage: req.query.error || ""
        });
    } catch (error) {
        console.error("Profile edit error:", error.message);
        res.status(500).send("Unable to load profile editor.");
    }
};

exports.createContent = async (req, res) => {
    try {
        const { type, title, body, mediaUrl } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        const normalizedType = type === "video" ? "video" : "post";
        const cleanTitle = (title || "").trim();
        const cleanBody = (body || "").trim();
        const cleanMediaUrl = (mediaUrl || "").trim();

        if (!cleanTitle && !cleanBody && !cleanMediaUrl) {
            return res.redirect("/dashboard?error=" + encodeURIComponent("Please add a title, message, or video link."));
        }

        user.content.push({
            type: normalizedType,
            title: cleanTitle || (normalizedType === "video" ? "New video" : "New post"),
            body: cleanBody || (normalizedType === "video" ? "Shared a new video update." : "Shared a new update."),
            mediaUrl: cleanMediaUrl
        });

        await user.save();

        return res.redirect("/dashboard?success=" + encodeURIComponent("Your update was shared successfully."));
    } catch (error) {
        console.error("Create content error:", error.message);
        return res.redirect("/dashboard?error=" + encodeURIComponent("Unable to share update. Please try again."));
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, email, bio, password, confirmPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        if (!username || !email) {
            return res.redirect("/profile/edit?error=" + encodeURIComponent("Username and email are required."));
        }

        if (password || confirmPassword) {
            if (password.length < 6) {
                return res.redirect("/profile/edit?error=" + encodeURIComponent("Password must be at least 6 characters long."));
            }

            if (password !== confirmPassword) {
                return res.redirect("/profile/edit?error=" + encodeURIComponent("Passwords do not match."));
            }
        }

        const duplicateUser = await User.findOne({
            _id: { $ne: user._id },
            $or: [{ email }, { username }]
        });

        if (duplicateUser) {
            return res.redirect("/profile/edit?error=" + encodeURIComponent("Username or email is already taken."));
        }

        user.username = username.trim();
        user.email = email.trim().toLowerCase();
        user.bio = (bio || "").trim();

        if (req.file) {
            user.profilePicture = `/uploads/profiles/${req.file.filename}`;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        return res.redirect("/profile?updated=1");
    } catch (error) {
        console.error("Update profile error:", error.message);
        return res.redirect("/profile/edit?error=" + encodeURIComponent("Unable to update profile. Please try again."));
    }
};

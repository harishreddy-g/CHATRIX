const bcrypt = require("bcrypt");
const User = require("../models/Users");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProfileView = (user) => ({
    username: user.username,
    email: user.email,
    bio: user.bio || "",
    profilePicture: user.profilePicture || "",
    friendsCount: user.friends.length,
    sentRequestsCount: user.sentRequests.length,
    receivedRequestsCount: user.receivedRequests.length,
    memberSince: user.createdAt
});

exports.renderDashboard = async (req, res) => {
    try {
        const searchTerm = (req.query.search || req.query.q || "").trim();
        const user = await User.findById(req.user.userId)
            .select("username email profilePicture friends receivedRequests sentRequests")
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
                _id: { $ne: req.user.userId },
                $or: [{ username: searchRegex }, { email: searchRegex }]
            })
                .select("username email profilePicture")
                .limit(12)
                .lean();

            const excludedIds = new Set([
                ...user.friends.map((friend) => friend._id.toString()),
                ...user.receivedRequests.map((request) => request._id.toString()),
                ...user.sentRequests.map((request) => request._id.toString())
            ]);

            searchResults = candidates.filter((candidate) => !excludedIds.has(candidate._id.toString()));
        }

        const feedUsers = await User.find({
            _id: { $ne: req.user.userId },
            content: { $exists: true, $ne: [] }
        })
            .select("username profilePicture content")
            .sort({ updatedAt: -1 })
            .limit(12)
            .lean();

        const contentFeed = feedUsers
            .flatMap((author) => (author.content || []).map((item) => ({
                ...item,
                author: {
                    _id: author._id,
                    username: author.username,
                    profilePicture: author.profilePicture
                }
            })))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 12);

        res.render("dashboard", {
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture || "",
            friendsCount: user.friends.length,
            friends: user.friends,
            pendingRequestsCount: user.receivedRequests.length,
            receivedRequests: user.receivedRequests,
            sentRequests: user.sentRequests,
            searchQuery: searchTerm,
            searchResults,
            friendResults,
            feed: contentFeed,
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
        const user = await User.findById(req.user.userId)
            .select("-password")
            .lean();

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        res.render("profile", {
            profile: buildProfileView(user),
            successMessage: req.query.updated === "1" ? "Profile updated successfully." : ""
        });
    } catch (error) {
        console.error("Profile error:", error.message);
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

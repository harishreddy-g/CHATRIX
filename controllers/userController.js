const bcrypt = require("bcrypt");
const User = require("../models/Users");

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
        const user = await User.findById(req.user.userId)
            .select("username email friends receivedRequests")
            .lean();

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        res.render("dashboard", {
            username: user.username,
            email: user.email,
            friendsCount: user.friends.length,
            pendingRequestsCount: user.receivedRequests.length
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

const User = require("../models/Users");

exports.toggleFollow = async (req, res) => {
    try {
        const currentId = req.user.userId;
        const targetId = req.params.id;

        if (currentId.toString() === targetId.toString()) {
            return res.status(400).json({ ok: false, error: "You cannot follow yourself." });
        }

        const [me, target] = await Promise.all([
            User.findById(currentId),
            User.findById(targetId)
        ]);

        if (!me || !target) return res.status(404).json({ ok: false, error: "User not found." });

        const isFollowing = me.following.some((id) => id.toString() === targetId.toString());

        if (isFollowing) {
            me.following = me.following.filter((id) => id.toString() !== targetId.toString());
            target.followers = target.followers.filter((id) => id.toString() !== currentId.toString());
        } else {
            me.following.push(target._id);
            target.followers.push(me._id);
        }

        await Promise.all([me.save(), target.save()]);

        res.json({ ok: true, following: !isFollowing, followerCount: target.followers.length });
    } catch (error) {
        console.error("Toggle follow error:", error.message);
        res.status(500).json({ ok: false, error: "Unable to update follow." });
    }
};

exports.getFollowList = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("username following followers").lean();
        if (!user) return res.status(404).json({ ok: false, error: "User not found." });

        const kind = req.query.type === "followers" ? "followers" : "following";
        const ids = user[kind] || [];
        const list = await User.find({ _id: { $in: ids } })
            .select("username profilePicture")
            .lean();

        res.json({ ok: true, type: kind, users: list });
    } catch (error) {
        console.error("Follow list error:", error.message);
        res.status(500).json({ ok: false, error: "Unable to load list." });
    }
};

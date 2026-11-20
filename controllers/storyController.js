const Story = require("../models/Story");
const User = require("../models/Users");

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const fetchStoryFeed = async (userId) => {
    const me = await User.findById(userId).select("following").lean();
    const authorIds = [...(me?.following || []).map((id) => id.toString()), userId.toString()];

    const stories = await Story.find({
        author: { $in: authorIds },
        expiresAt: { $gt: new Date() }
    })
        .populate("author", "username profilePicture")
        .sort({ createdAt: -1 })
        .lean();

    const grouped = new Map();
    stories.forEach((story) => {
        const key = story.author._id.toString();
        if (!grouped.has(key)) {
            grouped.set(key, {
                user: {
                    _id: story.author._id,
                    username: story.author.username,
                    profilePicture: story.author.profilePicture || ""
                },
                stories: [],
                allViewed: true
            });
        }
        const entry = grouped.get(key);
        const viewed = (story.views || []).some((id) => id.toString() === userId.toString());
        if (!viewed && entry.user._id.toString() !== userId.toString()) entry.allViewed = false;
        entry.stories.push({
            _id: story._id,
            media: story.media,
            text: story.text,
            background: story.background,
            createdAt: story.createdAt,
            viewed
        });
    });

    const result = [...grouped.values()];
    result.sort((a, b) => (a.allViewed === b.allViewed ? 0 : a.allViewed ? 1 : -1));
    return result;
};

exports.fetchStoryFeed = fetchStoryFeed;

exports.createStory = async (req, res) => {
    try {
        const text = (req.body.text || "").trim();
        const background = (req.body.background || "").trim();
        const media = req.file ? `/uploads/stories/${req.file.filename}` : "";

        if (!media && !text) {
            return res.redirect("/dashboard?error=" + encodeURIComponent("Add a photo or text to your story."));
        }

        await Story.create({
            author: req.user.userId,
            media,
            text,
            background,
            expiresAt: new Date(Date.now() + STORY_TTL_MS)
        });

        return res.redirect("/dashboard?success=" + encodeURIComponent("Your story was added."));
    } catch (error) {
        console.error("Create story error:", error.message);
        return res.redirect("/dashboard?error=" + encodeURIComponent("Unable to add story."));
    }
};

exports.viewStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story || story.expiresAt <= new Date()) {
            return res.status(404).json({ ok: false, error: "Story not available." });
        }

        const userId = req.user.userId;
        if (!story.views.some((id) => id.toString() === userId.toString())) {
            story.views.push(userId);
            await story.save();
        }

        res.json({ ok: true, viewCount: story.views.length });
    } catch (error) {
        console.error("View story error:", error.message);
        res.status(500).json({ ok: false, error: "Unable to record view." });
    }
};

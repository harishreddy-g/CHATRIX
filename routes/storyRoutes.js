const express = require("express");
const router = express.Router();
const storyController = require("../controllers/storyController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAuthPage } = authMiddleware;
const { uploadStoryMedia } = require("../middleware/upload");

router.post("/stories", requireAuthPage, (req, res, next) => {
    uploadStoryMedia(req, res, (error) => {
        if (error) return res.redirect("/dashboard?error=" + encodeURIComponent(error.message));
        next();
    });
}, storyController.createStory);

router.post("/stories/:id/view", authMiddleware, storyController.viewStory);

module.exports = router;

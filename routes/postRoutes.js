const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAuthPage } = authMiddleware;
const { uploadPostImages } = require("../middleware/upload");

const handleUpload = (middleware, onErrorRedirect) => (req, res, next) => {
    middleware(req, res, (error) => {
        if (error) return res.redirect(onErrorRedirect + "?error=" + encodeURIComponent(error.message));
        next();
    });
};

router.post(
    "/posts",
    requireAuthPage,
    handleUpload(uploadPostImages, "/dashboard"),
    postController.createPost
);

router.post("/posts/:id/like", authMiddleware, postController.toggleLike);
router.post("/posts/:id/comments", authMiddleware, postController.addComment);
router.post("/posts/:id/delete", requireAuthPage, postController.deletePost);

module.exports = router;

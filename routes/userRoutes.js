const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuthPage } = require("../middleware/authMiddleware");
const { uploadProfilePicture } = require("../middleware/upload");

router.get("/dashboard", requireAuthPage, userController.renderDashboard);
router.post("/dashboard/content", requireAuthPage, userController.createContent);
router.get("/profile", requireAuthPage, userController.renderProfile);
router.get("/users/:id", requireAuthPage, userController.renderUserProfile);
router.get("/profile/edit", requireAuthPage, userController.renderProfileEdit);
router.post(
    "/profile/edit",
    requireAuthPage,
    (req, res, next) => {
        uploadProfilePicture(req, res, (error) => {
            if (error) {
                return res.redirect("/profile/edit?error=" + encodeURIComponent(error.message));
            }
            next();
        });
    },
    userController.updateProfile
);

module.exports = router;

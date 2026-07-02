const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuthPage } = require("../middleware/authMiddleware");
const { uploadProfilePicture } = require("../middleware/upload");

router.use(requireAuthPage);

router.get("/dashboard", userController.renderDashboard);
router.post("/dashboard/content", userController.createContent);
router.get("/profile", userController.renderProfile);
router.get("/profile/edit", userController.renderProfileEdit);
router.post(
    "/profile/edit",
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

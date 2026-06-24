const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuthPage } = require("../middleware/authMiddleware");

router.use(requireAuthPage);

router.get("/dashboard", userController.renderDashboard);
router.get("/profile", userController.renderProfile);
router.get("/profile/edit", userController.renderProfileEdit);
router.post("/profile/edit", userController.updateProfile);

module.exports = router;

const express = require("express");
const router = express.Router();
const followController = require("../controllers/followController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/follow/:id", followController.toggleFollow);
router.get("/follow/:id/list", followController.getFollowList);

module.exports = router;

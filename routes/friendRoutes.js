const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/search', friendController.searchUsers);
router.post('/request/:receiverId', friendController.sendFriendRequest);
router.get('/requests/received', friendController.getReceivedRequests);
router.get('/requests/sent', friendController.getSentRequests);

module.exports = router;

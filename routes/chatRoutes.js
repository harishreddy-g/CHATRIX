const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuthPage } = require('../middleware/authMiddleware');

router.get('/chat', requireAuthPage, chatController.renderChat);

router.use('/api/chat', authMiddleware);
router.get('/api/chat/conversations', chatController.listConversations);
router.get('/api/chat/conversations/:id/messages', chatController.getMessages);
router.post('/api/chat/dm/:friendId', chatController.openDirectMessage);

module.exports = router;

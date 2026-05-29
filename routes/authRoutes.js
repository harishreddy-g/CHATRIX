const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authController.renderHome);
router.get('/login', authController.renderLogin);
router.get('/signup', authController.renderSignup);
router.get('/about', authController.renderAbout);
router.post('/signup', authController.signup);
router.post('/login', authController.login);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { uploadProfilePicture } = require('../middleware/upload');

router.get('/', authController.renderHome);
router.get('/login', authController.renderLogin);
router.get('/signup', authController.renderSignup);
router.get('/about', authController.renderAbout);
router.post('/signup', (req, res, next) => {
    uploadProfilePicture(req, res, (error) => {
        if (error) {
            return res.status(400).send(error.message);
        }
        next();
    });
}, authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;

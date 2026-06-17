const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { registerRules, loginRules } = require('../validators/authValidator');
const { protect } = require('../middleware/auth');

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe,
    deleteOwnAccount,
    changePassword
} = require('../controllers/authController');
const { reportFaultyHoneypot } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.delete('/me', protect, deleteOwnAccount);
router.post('/change-password', protect, changePassword);
router.post('/report-fault', protect, reportFaultyHoneypot);

module.exports = router;

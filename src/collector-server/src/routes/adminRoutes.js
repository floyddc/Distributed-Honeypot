const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getUsers,
    updateUserRole,
    getHoneypots,
    controlHoneypot
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);
router.get('/honeypots', protect, admin, getHoneypots);
router.post('/honeypots/:id/control', protect, admin, controlHoneypot);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getUsers, updateUserRole, getHoneypots, addHoneypot, deleteHoneypot, controlHoneypot } = require('../controllers/adminController');

router.get('/users', protect, admin, getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);

router.get('/honeypots', protect, admin, getHoneypots);
router.post('/honeypots', protect, admin, addHoneypot);
router.delete('/honeypots/:id', protect, admin, deleteHoneypot);
router.post('/honeypots/:id/status', protect, admin, controlHoneypot);

module.exports = router;

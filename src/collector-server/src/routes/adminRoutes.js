const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getUsers,
    updateUserRole,
    getHoneypots,
    controlHoneypot,
    getAttacks,
    clearAttacks
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);
router.get('/honeypots', protect, admin, getHoneypots);
router.get('/attacks', protect, admin, getAttacks);
router.delete('/attacks', protect, admin, clearAttacks);  
router.post('/honeypots/:id/control', protect, admin, controlHoneypot);

module.exports = router;

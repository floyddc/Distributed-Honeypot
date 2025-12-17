const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getUsers,
    updateUserRole,
    deleteUser,
    getHoneypots,
    getReports,
    controlHoneypot,
    getAttacks,
    clearReports,
    clearAttacks
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);
router.delete('/users/:id', protect, admin, deleteUser);
router.get('/honeypots', protect, admin, getHoneypots);
router.get('/attacks', protect, admin, getAttacks);
router.delete('/reports', protect, admin, clearReports);
router.get('/reports', protect, admin, getReports);
router.delete('/attacks', protect, admin, clearAttacks);  
router.post('/honeypots/:id/control', protect, admin, controlHoneypot);

module.exports = router;

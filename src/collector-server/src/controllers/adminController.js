const User = require('../models/User');
const Honeypot = require('../models/Honeypot');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.role = req.body.role || user.role;
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all honeypots
// @route   GET /api/admin/honeypots
// @access  Private/Admin
const getHoneypots = async (req, res) => {
    try {
        const honeypots = await Honeypot.find({});
        res.json(honeypots);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a honeypot
// @route   DELETE /api/admin/honeypots/:id
// @access  Private/Admin
const deleteHoneypot = async (req, res) => {
    try {
        const honeypot = await Honeypot.findById(req.params.id);

        if (honeypot) {
            await honeypot.deleteOne();
            res.json({ message: 'Honeypot removed' });
        } else {
            res.status(404).json({ message: 'Honeypot not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Control honeypot status
// @route   POST /api/admin/honeypots/:id/status
// @access  Private/Admin
const controlHoneypot = async (req, res) => {
    const { status } = req.body; // 'start' or 'stop'
    const { id } = req.params; // Honeypot ID (or 'all')

    const io = req.app.get('io');

    if (io) {
        // Broadcast command. Target can be 'all' or specific ID.
        // The honeypot script will check if the target matches its ID.
        io.emit('admin_command', { target: id, command: status });

        // Update status in DB if it's a real honeypot
        if (id !== 'all') {
            try {
                await Honeypot.findByIdAndUpdate(id, { status: status === 'start' ? 'online' : 'offline' });
            } catch (err) {
                console.error('Error updating honeypot status in DB:', err);
            }
        } else {
            // If 'all', update all
            try {
                await Honeypot.updateMany({}, { status: status === 'start' ? 'online' : 'offline' });
            } catch (err) {
                console.error('Error updating all honeypots status in DB:', err);
            }
        }

        res.json({ message: `Command ${status} sent to target ${id} ` });
    } else {
        res.status(500).json({ message: 'Socket.io instance not found' });
    }
};

module.exports = {
    getUsers,
    updateUserRole,
    getHoneypots,
    deleteHoneypot,
    controlHoneypot
};

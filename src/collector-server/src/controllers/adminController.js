const User = require('../models/User');
const Honeypot = require('../models/Honeypot');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            const oldRole = user.role;
            user.role = req.body.role || user.role;
            const updatedUser = await user.save();
            
            if (oldRole !== updatedUser.role) {
                const io = req.app.get('io');
                if (io) {
                    io.emit('role_updated', {
                        userId: updatedUser._id.toString(),
                        newRole: updatedUser.role,
                        message: `You have been promoted to ${updatedUser.role}`
                    });
                }
                console.log(`User ${updatedUser.username} promoted to ${updatedUser.role}`);
            }
            
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

const getHoneypots = async (req, res) => {
    try {
        const honeypots = await Honeypot.find({});
        res.json(honeypots);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getAttacks = async (req, res) => {
    try {
        const Attack = require('../models/Attack');
        const attacks = await Attack.find({}).sort({ timestamp: -1 }).limit(100);
        res.json(attacks);
    } catch (error) {
        console.error('Error fetching attacks:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const clearAttacks = async (req, res) => {
    try {
        const Attack = require('../models/Attack');
        const result = await Attack.deleteMany({});
        console.log(`Cleared ${result.deletedCount} attacks from database`);
        const io = req.app.get('io');
        if (io) {
            io.emit('attacks_cleared', { 
                message: 'All attacks have been cleared',
                timestamp: new Date().toISOString()
            });
        }
        res.json({ 
            message: 'All attacks cleared successfully', 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error('Error clearing attacks:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const findDockerContainer = async (honeypotId) => {
    const containers = await docker.listContainers({ all: true });
    const containerNameMap = {
        'node1': 'honeypot-node1',
        'node2': 'honeypot-node2',
        'node3': 'honeypot-node3'
    };
    const targetName = containerNameMap[honeypotId];
    if (!targetName) return null;
    return containers.find(c =>
        c.Names.some(name => name.includes(targetName))
    );
};

const controlHoneypot = async (req, res) => {
    try {
        const { action } = req.body;
        const { id } = req.params;

        if (id === 'all') {
            const honeypots = await Honeypot.find({});
            const results = [];

            for (const hp of honeypots) {
                try {
                    const containerInfo = await findDockerContainer(hp.honeypotId);
                    if (!containerInfo) {
                        results.push({ honeypotId: hp.honeypotId, status: 'container not found' });
                        continue;
                    }

                    const container = docker.getContainer(containerInfo.Id);

                    if (action === 'start') {
                        if (containerInfo.State !== 'running') {
                            await container.start();
                            await Honeypot.findByIdAndUpdate(hp._id, { status: 'online' });
                            results.push({ honeypotId: hp.honeypotId, status: 'started' });
                        } else {
                            results.push({ honeypotId: hp.honeypotId, status: 'already running' });
                        }
                    } else if (action === 'stop') {
                        if (containerInfo.State === 'running') {
                            await container.stop();
                            await Honeypot.findByIdAndUpdate(hp._id, { status: 'offline' });
                            results.push({ honeypotId: hp.honeypotId, status: 'stopped' });
                        } else {
                            results.push({ honeypotId: hp.honeypotId, status: 'already stopped' });
                        }
                    }
                } catch (err) {
                    console.error(`Error controlling ${hp.honeypotId}:`, err.message);
                    results.push({ honeypotId: hp.honeypotId, status: 'error', error: err.message });
                }
            }

            return res.json({ message: `Command ${action} executed on all honeypots`, results });
        }

        const honeypot = await Honeypot.findById(id);
        if (!honeypot) {
            return res.status(404).json({ message: 'Honeypot not found' });
        }

        const containerInfo = await findDockerContainer(honeypot.honeypotId);
        if (!containerInfo) {
            return res.status(404).json({ message: 'Docker container not found' });
        }

        const container = docker.getContainer(containerInfo.Id);

        if (action === 'start') {
            if (containerInfo.State !== 'running') {
                await container.start();
                await Honeypot.findByIdAndUpdate(id, { status: 'online' });
                res.json({ message: `Honeypot ${honeypot.honeypotId} started successfully` });
            } else {
                res.json({ message: `Honeypot ${honeypot.honeypotId} is already running` });
            }
        } else if (action === 'stop') {
            if (containerInfo.State === 'running') {
                await container.stop();
                await Honeypot.findByIdAndUpdate(id, { status: 'offline' });
                res.json({ message: `Honeypot ${honeypot.honeypotId} stopped successfully` });
            } else {
                res.json({ message: `Honeypot ${honeypot.honeypotId} is already stopped` });
            }
        } else {
            res.status(400).json({ message: 'Invalid action. Use "start" or "stop"' });
        }

    } catch (error) {
        console.error('Error controlling honeypot:', error);
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last admin user' });
            }
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const deletedUserId = user._id.toString();
        await User.findByIdAndDelete(req.params.id);
        
        const io = req.app.get('io');
        if (io) {
            io.emit('user_deleted', { 
                userId: deletedUserId,
                message: 'Your account has been deleted by an admin'
            });
        }
        
        console.log(`User ${user.username} deleted successfully`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const reportFaultyHoneypot = async (req, res) => {
    try {
        if (!req.user || !req.user.username) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { honeypotId, port, message } = req.body;
        
        if (!honeypotId || !port) {
            return res.status(400).json({ message: 'honeypotId and port are required' });
        }
        
        const reportedBy = req.user.username;

        const io = req.app.get('io');
        if (io) {
            io.emit('honeypot_fault_report', {
                honeypotId,
                port,
                reportedBy,
                timestamp: new Date().toISOString(),
                message: message || `Honeypot ${honeypotId}:${port} reported as faulty`
            });
        }

        console.log(`Honeypot ${honeypotId}:${port} reported as faulty by ${reportedBy}`);
        res.json({ 
            message: 'Report sent to admins',
            honeypotId,
            port,
            reportedBy
        });
    } catch (error) {
        console.error('Error reporting faulty honeypot:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUsers,
    updateUserRole,
    getHoneypots,
    controlHoneypot,
    getAttacks,
    clearAttacks,
    deleteUser,
    reportFaultyHoneypot
};

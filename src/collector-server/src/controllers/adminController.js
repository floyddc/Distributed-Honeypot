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

const getHoneypots = async (req, res) => {
    try {
        const honeypots = await Honeypot.find({});
        res.json(honeypots);
    } catch (error) {
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

module.exports = {
    getUsers,
    updateUserRole,
    getHoneypots,
    controlHoneypot
};

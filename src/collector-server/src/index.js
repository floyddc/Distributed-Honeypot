require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const Honeypot = require('./models/Honeypot');
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/honeypots', async (req, res) => {
    try {
        const honeypots = await Honeypot.find().select('honeypotId status port lastSeen');
        res.json(honeypots);
    } catch (error) {
        console.error(`Honeypots not found`);
    }
});

app.get('/api/attacks', async (req, res) => {
    try {
        const Attack = require('./models/Attack');
        const attacks = await Attack.find({}).sort({ timestamp: -1 }).limit(50);
        res.json(attacks);
    } catch (error) {
        console.error('Error fetching attacks:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Make io accessible in routes
app.set('io', io);

// Basic Route
app.get('/', (req, res) => {
    res.send('Distributed Honeypot Collector Server is running...');
});

const honeypotHeartbeats = new Map();
const honeypotSockets = new Map();

setInterval(async () => {
    const timeout = 15000;
    const threshold = new Date(Date.now() - timeout);

    try {
        const staleHoneypots = await Honeypot.find({
            status: 'online',
            lastSeen: { $lt: threshold }
        });

        for (const hp of staleHoneypots) {
            hp.status = 'offline';
            await hp.save();

            console.log(`Honeypot ${hp.honeypotId} marked as offline (stale)`);

            io.emit('honeypot_status_change', {
                honeypotId: hp.honeypotId,
                status: 'offline',
                timestamp: new Date().toISOString()
            });

            if (honeypotHeartbeats.has(hp.honeypotId)) {
                honeypotHeartbeats.delete(hp.honeypotId);
            }
        }
    } catch (error) {
        console.error('Error checking stale honeypots:', error);
    }
}, 10000);

io.on('connection', (socket) => {
    console.log('A user/honeypot connected:', socket.id);

    socket.on('honeypot_heartbeat', async (data) => {
        const { honeypotId, port, timestamp } = data;

        if (!port) {
            console.error(`Heartbeat from ${honeypotId} missing port`);
            return;
        }

        honeypotHeartbeats.set(honeypotId, Date.now());

        try {
            await Honeypot.findOneAndUpdate(
                { honeypotId },
                {
                    status: 'online',
                    lastSeen: new Date(timestamp),
                    port: port
                },
                { upsert: true }
            );
            console.log(`Heartbeat from ${honeypotId}`);
        } catch (error) {
            console.error(`Error updating heartbeat for ${honeypotId}`);
        }
    });

    socket.on('honeypot_status', async (data) => {
        const { honeypotId, status, port, timestamp } = data;

        if (!port) {
            console.error(`Status from ${honeypotId} missing port`);
            return;
        }

        honeypotHeartbeats.set(honeypotId, Date.now());

        try {
            await Honeypot.findOneAndUpdate(
                { honeypotId },
                {
                    status,
                    lastSeen: new Date(timestamp),
                    port: port
                },
                { upsert: true }
            );

            io.emit('honeypot_status_change', {
                honeypotId,
                status,
                port,
                timestamp
            });

            console.log(`Honeypot ${honeypotId} is ${status} on port ${port}`);
        } catch (error) {
            console.error(`Error updating honeypot status for ${honeypotId}`);
        }
    });

    socket.on('honeypot_data', async (data) => {
        console.log('Received honeypot data:', data);

        try {
            const Attack = require('./models/Attack');  // Save on DB
            await Attack.create(data);
        } catch (error) {
            console.error('Error saving attack:', error);
        }

        io.emit('new_attack', data);
    });


    socket.on('session_data', (data) => {
        console.log(`[DEBUG] Received session_data from ${data.honeypotId}:`, data.data);

        io.emit('live_session_feed', data);
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);

        for (const [honeypotId, socketId] of honeypotSockets.entries()) {
            if (socketId === socket.id) {
                console.log(`Honeypot ${honeypotId} disconnected`);

                try {
                    await Honeypot.findOneAndUpdate(
                        { honeypotId },
                        { status: 'offline' },
                        { upsert: true }
                    );

                    io.emit('honeypot_status_change', {
                        honeypotId,
                        status: 'offline',
                        timestamp: new Date().toISOString()
                    });

                    honeypotHeartbeats.delete(honeypotId);
                    honeypotSockets.delete(honeypotId);
                } catch (error) {
                    console.error(`Error marking honeypot ${honeypotId} offline`);
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

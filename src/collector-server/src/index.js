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
        origin: '*', // Allow all for now, restrict in production
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

// Make io accessible in routes
app.set('io', io);

// Basic Route
app.get('/', (req, res) => {
    res.send('Distributed Honeypot Collector Server is running...');
});

// Maps to track heartbeats and sockets
const honeypotHeartbeats = new Map();
const honeypotSockets = new Map();

// Check inactive honeypots
setInterval(async () => {
    const now = Date.now();
    const timeout = 15000;
    
    for (const [honeypotId, lastSeen] of honeypotHeartbeats.entries()) {
        if (now - lastSeen > timeout) {
            try {
                await Honeypot.findOneAndUpdate(
                    { honeypotId },
                    { status: 'offline' },
                    { upsert: true }
                );
                console.log(`Honeypot ${honeypotId} marked as offline`);
                
                io.emit('honeypot_status_change', {
                    honeypotId,
                    status: 'offline',
                    timestamp: new Date().toISOString()
                });
                
                honeypotHeartbeats.delete(honeypotId);
            } catch (error) {
                console.error(`Error updating honeypot ${honeypotId}`);
            }
        }
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

    socket.on('honeypot_data', (data) => {
        console.log('Received honeypot data:', data);
        // Todo: save on DB 
        io.emit('honeypot_data', data);
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

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const Honeypot = require('./models/Honeypot');
const Session = require('./models/Session');
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
        res.status(500).json({ message: 'Error fetching honeypots' });
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

app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await Session.find({ status: 'active' })
            .select('sessionId honeypotId type buffer fields mouseX mouseY lastActivity')
            .sort({ lastActivity: -1 });
        
        console.log(`[API] Returning ${sessions.length} active sessions`);
        res.json(sessions);
    } catch (error) {
        console.error('[API] Error fetching sessions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
    try {
        const session = await Session.findOne({ sessionId: req.params.sessionId });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.json(session);
    } catch (error) {
        console.error('[API] Error fetching session:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Make io accessible in routes
app.set('io', io);
const mqttService = require('./mqtt')(io);

// Basic Route
app.get('/', (req, res) => {
    res.send('Distributed Honeypot Collector Server is running...');
});

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
        }
    } catch (error) {
        console.error('Error checking stale honeypots:', error);
    }
}, 10000);

setInterval(async () => {
    const timeout = 20000; // 20s
    const threshold = new Date(Date.now() - timeout);
    
    try {
        const result = await Session.updateMany(
            {
                status: 'active',
                lastActivity: { $lt: threshold }
            },
            {
                $set: {
                    status: 'ended',
                    endTime: new Date()
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`[DB] Marked ${result.modifiedCount} sessions as ended due to inactivity`);
            
            const endedSessions = await Session.find({
                status: 'ended',
                endTime: { $gte: threshold }
            }).select('sessionId');
            
            endedSessions.forEach(session => {
                io.emit('live_interaction', {
                    sessionId: session.sessionId,
                    type: 'session_end',
                    timestamp: Date.now()
                });
            });
        }
    } catch (error) {
        console.error('[DB] Error cleaning up inactive sessions:', error);
    }
}, 10000);

io.on('connection', async (socket) => {
    console.log('A user/honeypot connected:', socket.id);

    try {
        const activeSessions = await Session.find({ status: 'active' }).select('sessionId honeypotId type lastActivity');
        socket.emit('active_sessions', activeSessions);
        console.log(`[Socket] Sent ${activeSessions.length} active sessions to client ${socket.id}`);
    } catch (error) {
        console.error('[Socket] Error loading active sessions:', error);
    }

    socket.on('honeypot_data', async (data) => {
        console.log('Received honeypot data:', data);

        try {
            const Attack = require('./models/Attack');
            await Attack.create(data);
        } catch (error) {
            console.error('Error saving attack:', error);
        }

        io.emit('new_attack', data);
    });

    socket.on('session_data', async (data) => {
        console.log(`[SSH] Received session_data from ${data.honeypotId}`);
        
        const sessionId = data.sessionId || 'default';
        
        try {
            let session = await Session.findOne({ sessionId });
            
            if (!session) {
                session = new Session({
                    sessionId,
                    honeypotId: data.honeypotId,
                    type: 'ssh',
                    buffer: data.data,
                    lastActivity: new Date()
                });
                console.log(`[DB] Created new SSH session: ${sessionId}`);
            } else {
                session.buffer += data.data;
                session.lastActivity = new Date();
            }
            
            await session.save();
            
            io.emit('live_session_feed', data);
        } catch (error) {
            console.error('[DB] Error saving session data:', error);
        }
    });

    socket.on('honeypot_interaction', async (data) => {
        console.log(`[LOGIN] ${data.type} on ${data.honeypotId}`);
        
        const { sessionId } = data;
        
        try {
            let session = await Session.findOne({ sessionId });
            
            if (!session) {
                session = new Session({
                    sessionId,
                    honeypotId: data.honeypotId,
                    type: 'login',
                    events: [data],
                    fields: {},
                    mouseX: data.x || 0,
                    mouseY: data.y || 0,
                    lastActivity: new Date()
                });
                console.log(`[DB] Created new login session: ${sessionId}`);
            } else {
                session.events.push(data);
                session.lastActivity = new Date();
                
                if (data.type === 'mousemove') {
                    session.mouseX = data.x;
                    session.mouseY = data.y;
                } else if (data.type === 'input' && data.field) {
                    if (!session.fields) session.fields = {};
                    session.fields[data.field] = data.value;
                    session.markModified('fields'); 
                }
                
                if (data.type === 'session_end') {
                    session.status = 'ended';
                    session.endTime = new Date();
                }
            }
            
            await session.save();
            
            io.emit('live_interaction', data);
        } catch (error) {
            console.error('[DB] Error saving interaction:', error);
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

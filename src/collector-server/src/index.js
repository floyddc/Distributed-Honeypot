require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

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

// Basic Route
app.get('/', (req, res) => {
    res.send('Distributed Honeypot Collector Server is running...');
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user/honeypot connected:', socket.id);

    socket.on('honeypot_data', (data) => {
        // Save to DB (omitted for brevity in this step, but we broadcast it)
        // In real app: await Attack.create(data);

        // Broadcast to all clients (Dashboard)
        io.emit('new_attack', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

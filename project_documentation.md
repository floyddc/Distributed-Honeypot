# Distributed Honeypot System - Project Documentation

## 1. Project Overview
This project is a distributed honeypot system designed to collect and visualize cyber attack data in real-time.
- **Architecture**: Central Collector Server (Node.js) receiving data from distributed Honeypot Nodes via WebSockets.
- **Client**: Vue.js Dashboard for administrators to monitor attacks.
- **Database**: MongoDB for storing users, honeypots, logs, and attack events.

## 2. Completed Work (User's Responsibility)

### Backend: Collector Server (`src/collector-server`)
- **Technology**: Node.js, Express, Socket.io, Mongoose.
- **Authentication**: JWT-based (Login/Register).
- **Database Connection**: Connected to MongoDB (Docker container).
- **Real-time Engine**: Socket.io server listening for `honeypot_data` events and broadcasting `new_attack` events to the dashboard.
- **Mock Script**: `scripts/mock-honeypot.js` to simulate incoming traffic for testing.

### Database: MongoDB Schemas (`src/collector-server/src/models`)
- **User**: Admin/User management with password hashing.
- **Honeypot**: Registry of active honeypot nodes.
- **Log**: Raw logs from honeypots.
- **Attack**: Processed attack events (Source IP, Port, Severity, GeoData).

### Frontend: Client Dashboard (`src/dashboard-client`)
- **Technology**: Vue 3, Vite, Pinia, TailwindCSS v4.
- **Design**: "Cyberpunk/Hacker" aesthetic (Dark mode, Neon accents, Glassmorphism).
- **Features**:
    - **Auth**: Login and Registration pages with validation.
    - **Real-time Table**: Displays incoming attacks instantly via WebSockets.
    - **Charts**: Visualizes "Attacks by Severity" (Doughnut) and "Attacks by Protocol" (Bar) using `vue-chartjs`.
    - **Responsive Layout**: Sidebar and Header with glass effect.

## 3. Setup & Running Instructions

### Prerequisites
- Docker Desktop (for MongoDB)
- Node.js (v18+)

### Step 1: Start Database
```bash
cd src
docker-compose up -d mongo
```

### Step 2: Start Collector Server
```bash
cd src/collector-server
npm install
npm start
```
*Server runs on port 3000.*

### Step 3: Start Client Dashboard
```bash
cd src/dashboard-client
npm install
npm run dev
```
*Dashboard runs on http://localhost:5173.*

### Step 4: Run Mock Honeypot (Optional)
To simulate attacks without real honeypots:
```bash
cd src/collector-server
node scripts/mock-honeypot.js
```

## 4. API & WebSocket Reference

### REST API
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Authenticate and receive JWT.
- `GET /api/auth/me`: Get current user profile (Protected).

### WebSocket Events
- **Event**: `honeypot_data` (Client -> Server)
    - Payload: `{ sourceIp, destinationPort, protocol, severity, geoData }`
- **Event**: `new_attack` (Server -> Dashboard)
    - Payload: Same as above.

## 5. Next Steps (Colleague's Responsibility)
- Implement the actual distributed Honeypot Nodes (Python/Go).
- Connect Nodes to the Collector Server using the WebSocket protocol defined above.

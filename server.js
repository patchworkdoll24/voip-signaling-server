const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Map userId -> socketId
const users = new Map();

app.get('/', (req, res) => {
    res.send({
        status: 'online',
        message: 'VoIP WebRTC Signaling Server is running',
        connectedUsers: Array.from(users.keys())
    });
});

io.on('connection', (socket) => {
    console.log(`[+] New socket client connected: ${socket.id}`);

    // Register user ID
    socket.on('register', (data) => {
        const { userId } = data;
        if (!userId) return;

        users.set(userId, socket.id);
        socket.userId = userId;
        console.log(`[User Registered] ID: ${userId} -> Socket: ${socket.id}`);
        socket.emit('registered', { userId, status: 'success' });
    });

    // Forward SDP Offer
    socket.on('call-user', (data) => {
        const { callerId, targetId, sdp } = data;
        const targetSocketId = users.get(targetId);

        if (targetSocketId) {
            console.log(`[Call Offer] ${callerId} -> ${targetId}`);
            io.to(targetSocketId).emit('incoming-call', { callerId, sdp });
        } else {
            console.log(`[Call Failed] Target ${targetId} not online.`);
            socket.emit('user-unavailable', { targetId });
        }
    });

    // Forward SDP Answer
    socket.on('make-answer', (data) => {
        const { targetId, sdp } = data;
        const targetSocketId = users.get(targetId);

        if (targetSocketId) {
            console.log(`[Call Answer] -> ${targetId}`);
            io.to(targetSocketId).emit('call-answered', { sdp });
        }
    });

    // Forward ICE Candidate
    socket.on('ice-candidate', (data) => {
        const { targetId, candidate } = data;
        const targetSocketId = users.get(targetId);

        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', { candidate });
        }
    });

    // Hangup
    socket.on('hang-up', (data) => {
        const { targetId } = data;
        const targetSocketId = users.get(targetId);

        if (targetSocketId) {
            console.log(`[Hang Up] -> ${targetId}`);
            io.to(targetSocketId).emit('hang-up');
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.userId) {
            users.delete(socket.userId);
            console.log(`[-] User disconnected: ${socket.userId}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  VoIP WebRTC Signaling Server listening on port ${PORT}`);
    console.log(`  Local URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
});

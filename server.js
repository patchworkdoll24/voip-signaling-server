const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with open CORS and both WebSocket & polling support
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Root endpoint to verify the service is awake via browser
app.get('/', (req, res) => {
  res.status(200).send('VoIP Signaling Server is running.');
});

// Room & WebRTC Signaling Logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', socket.id);
  });

  // Relay WebRTC Offer
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', data);
  });

  // Relay WebRTC Answer
  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', data);
  });

  // Relay ICE Candidates
  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', data);
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// CRITICAL FOR RENDER:
// 1. Must use process.env.PORT (Render sets this dynamically).
// 2. Must bind to '0.0.0.0' to accept external traffic.
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

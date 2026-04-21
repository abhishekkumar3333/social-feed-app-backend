require('dotenv').config();
const http = require('http');
const connectDB = require('./src/config/db');
const { Server } = require('socket.io');

// Connect Database
connectDB().then(() => {
  // Require App and Workers after DB and Env are ready
  const app = require('./src/app');
  require('./src/workers');

  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  global.io = io;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their notification room`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('Redis and Background Workers ready 🚀');
  });
});

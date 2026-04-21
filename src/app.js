const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { getFeed, getExploreFeed } = require('./controllers/postController');
const { getQueueStats } = require('./controllers/adminController');
const { protect } = require('./middlewares/auth');

const app = express();

// Security and Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow frontend to load images
}));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/feed', protect, getFeed);
app.get('/api/feed/explore', protect, getExploreFeed);

app.get('/api/admin/queue-stats', protect, getQueueStats);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;

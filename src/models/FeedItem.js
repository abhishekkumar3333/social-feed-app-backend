const mongoose = require('mongoose');

const feedItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    default: 0,
  },
  insertedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  // We use insertedAt instead of standard timestamps for explicit control
  timestamps: false,
});

// Primary index for feed retrieval
feedItemSchema.index({ userId: 1, score: -1 });
feedItemSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('FeedItem', feedItemSchema);

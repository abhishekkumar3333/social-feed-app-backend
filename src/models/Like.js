const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  }
}, {
  timestamps: true,
});

// Unique compound index so a user can't like a post twice
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);

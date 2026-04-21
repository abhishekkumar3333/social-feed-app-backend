const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 500,
  },
  mediaUrls: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
  },
  moderationScore: {
    type: Number,
    default: 0,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  commentCount: {
    type: Number,
    default: 0,
  },
  shareCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
});

// Indexes for feed and filtering
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ status: 1 });

module.exports = mongoose.model('Post', postSchema);

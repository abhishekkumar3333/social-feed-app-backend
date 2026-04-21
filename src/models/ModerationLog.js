const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  jobId: {
    type: String,
    required: true,
  },
  result: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    required: true,
  },
  flagReasons: [{
    type: String,
  }],
  processedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: false,
});

moderationLogSchema.index({ postId: 1 });
moderationLogSchema.index({ jobId: 1 }, { unique: true });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);

const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  followeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, {
  timestamps: true,
});

// Unique compound index to prevent duplicate follows
followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);

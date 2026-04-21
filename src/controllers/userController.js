const User = require('../models/User');
const Follow = require('../models/Follow');
const { notificationQueue } = require('../queues');

// GET /api/users/:id/profile
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isFollowing = await Follow.findOne({
    followerId: req.user._id,
    followeeId: user._id
  });

  res.json({
    user,
    isFollowing: !!isFollowing,
    stats: {
      followersCount: user.followerCount,
      followingCount: user.followingCount
    }
  });
};

// POST /api/users/:id/follow - Toggle follow
const toggleFollow = async (req, res) => {
  const targetUserId = req.params.id;

  if (targetUserId === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  const userToFollow = await User.findById(targetUserId);
  if (!userToFollow) return res.status(404).json({ message: 'User not found' });

  const existingFollow = await Follow.findOne({
    followerId: req.user._id,
    followeeId: targetUserId
  });

  if (existingFollow) {
    await Follow.deleteOne({ _id: existingFollow._id });
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: -1 } });
    return res.json({ message: 'Unfollowed', isFollowing: false });
  }

  await Follow.create({
    followerId: req.user._id,
    followeeId: targetUserId
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: 1 } });
  await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: 1 } });

  await notificationQueue.add('follow-notif', {
    recipientId: targetUserId,
    actorId: req.user._id,
    type: 'follow'
  });

  res.json({ message: 'Followed', isFollowing: true });
};

module.exports = {
  getUserProfile,
  toggleFollow,
};

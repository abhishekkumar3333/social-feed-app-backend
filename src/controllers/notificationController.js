const Notification = require('../models/Notification');

// GET /api/notifications
const getNotifications = async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  const notifications = await Notification.find({ recipientId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorId', 'username displayName avatarUrl')
    .populate('postId', 'content');

  const unreadCount = await Notification.countDocuments({
    recipientId: req.user._id,
    read: false
  });

  res.setHeader('X-Unread-Count', unreadCount);
  res.json(notifications);
};

const markAsRead = async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification || notification.recipientId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  notification.read = true;
  await notification.save();

  res.json(notification);
};

const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.json({ message: 'All notifications marked as read' });
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

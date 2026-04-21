const { moderationQueue, fanoutQueue, notificationQueue } = require('../queues');

const getQueueStats = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const [modStats, fanoutStats, notifStats] = await Promise.all([
    moderationQueue.getJobCounts(),
    fanoutQueue.getJobCounts(),
    notificationQueue.getJobCounts(),
  ]);

  res.json({
    moderation: modStats,
    fanout: fanoutStats,
    notification: notifStats
  });
};

module.exports = {
  getQueueStats
};

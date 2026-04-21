const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const Notification = require('../models/Notification');
const { QUEUES } = require('../constants');

const notificationWorker = new Worker(QUEUES.NOTIFICATION, async (job) => {
  const { recipientId, actorId, type, postId } = job.data;
  console.log(`🔔 WORKER PROCESSING NOTIF: ${type} for ${recipientId}`);

  try {
    const notification = await Notification.create({
      recipientId,
      actorId: (!actorId || actorId === 'SYSTEM') ? process.env.SYSTEM_USER_ID : actorId,
      type,
      postId
    });
    console.log('✅ NOTIFICATION SAVED TO DB:', notification._id);

    if (global.io) {
      global.io.to(recipientId.toString()).emit('notification', notification);
    }
    
    return { success: true, id: notification._id };
  } catch (err) {
    console.error('❌ NOTIFICATION SAVE FAILED:', err.message);
    throw err;
  }
}, { 
  connection,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 100 }
});

module.exports = notificationWorker;

const { Queue } = require('bullmq');
const { connection } = require('../config/redis');
const { QUEUES } = require('../constants');

const moderationQueue = new Queue(QUEUES.MODERATION, { connection });
const fanoutQueue = new Queue(QUEUES.FANOUT, { connection });
const notificationQueue = new Queue(QUEUES.NOTIFICATION, { connection });

module.exports = {
  moderationQueue,
  fanoutQueue,
  notificationQueue,
};

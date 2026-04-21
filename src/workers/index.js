const moderationWorker = require('./moderationWorker');
const fanoutWorker = require('./fanoutWorker');
const notificationWorker = require('./notificationWorker');

console.log('All workers initialized and running.');

module.exports = {
  moderationWorker,
  fanoutWorker,
  notificationWorker,
};

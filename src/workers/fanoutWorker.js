const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const Follow = require('../models/Follow');
const FeedItem = require('../models/FeedItem');
const { QUEUES, SCORING_WEIGHTS } = require('../constants');


const fanoutWorker = new Worker(QUEUES.FANOUT, async (job) => {
  const { postId, authorId } = job.data;
  console.log(`Starting fanout for post ${postId}`);

  const followers = await Follow.find({ followeeId: authorId });

  const feedItems = followers.map(f => ({
    userId: f.followerId,
    postId: postId,
    score: SCORING_WEIGHTS.AGE_OFFSET,
    insertedAt: new Date()
  }));

  feedItems.push({
    userId: authorId,
    postId: postId,
    score: SCORING_WEIGHTS.AGE_OFFSET,
    insertedAt: new Date()
  });

  if (feedItems.length > 0) {
    try {
      await FeedItem.insertMany(feedItems, { ordered: false });
    } catch (err) {
      console.log(`Fanout partially complete: ${err.message}`);
    }
  }

  console.log(`Fanout complete for ${feedItems.length} users`);
}, { connection });

module.exports = fanoutWorker;

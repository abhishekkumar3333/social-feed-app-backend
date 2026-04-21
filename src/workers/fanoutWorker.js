const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const Follow = require('../models/Follow');
const FeedItem = require('../models/FeedItem');
const { QUEUES, SCORING_WEIGHTS } = require('../constants');

/**
 * Funneling post to followers' feeds
 */
const fanoutWorker = new Worker(QUEUES.FANOUT, async (job) => {
  const { postId, authorId } = job.data;
  console.log(`Starting fanout for post ${postId}`);

  // 1. Get all followers
  const followers = await Follow.find({ followeeId: authorId });

  // 2. Prepare feed items (materialized view)
  const feedItems = followers.map(f => ({
    userId: f.followerId,
    postId: postId,
    score: SCORING_WEIGHTS.AGE_OFFSET, // Initial score
    insertedAt: new Date()
  }));

  // 3. Add to author's own feed as well
  feedItems.push({
    userId: authorId,
    postId: postId,
    score: SCORING_WEIGHTS.AGE_OFFSET,
    insertedAt: new Date()
  });

  // 4. Bulk insert for performance
  if (feedItems.length > 0) {
    // We use insertMany with ordered: false to skip duplicates if they occur
    try {
      await FeedItem.insertMany(feedItems, { ordered: false });
    } catch (err) {
      // Partial failures due to duplicate keys (unique index on userId, postId) are fine
      console.log(`Fanout partially complete: ${err.message}`);
    }
  }

  console.log(`Fanout complete for ${feedItems.length} users`);
}, { connection });

module.exports = fanoutWorker;

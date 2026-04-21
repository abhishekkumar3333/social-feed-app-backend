const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const Post = require('../models/Post');
const ModerationLog = require('../models/ModerationLog');
const { fanoutQueue, notificationQueue } = require('../queues');
const { BAD_WORDS, QUEUES } = require('../constants');

const moderationWorker = new Worker(QUEUES.MODERATION, async (job) => {
  const { postId } = job.data;
  console.log(`Moderating post: ${postId}`);

  const post = await Post.findById(postId);
  if (!post) return;

  const content = post.content.toLowerCase();
  const foundBadWords = BAD_WORDS.filter(word => content.includes(word.trim().toLowerCase()));
  const hasBadWord = foundBadWords.length > 0;

  let status = 'approved';
  let flagReasons = [];

  if (hasBadWord) {
    status = 'rejected';
    flagReasons = [`Content violates community guidelines (prohibited words: ${foundBadWords.join(', ')})`];
    
    post.status = status;
    await post.save();

    await notificationQueue.add('post_rejected', {
      recipientId: post.authorId,
      actorId: process.env.SYSTEM_USER_ID,
      type: 'post_rejected',
      postId: post._id
    });
  } else {
    post.status = 'approved';
    await post.save();

    // Trigger Fanout
    await fanoutQueue.add(`fanout-${post._id}`, { 
      postId: post._id, 
      authorId: post.authorId 
    });

    await notificationQueue.add('post_approved', {
      recipientId: post.authorId,
      actorId: process.env.SYSTEM_USER_ID,
      type: 'post_approved',
      postId: post._id
    });
  }

  // Create Moderation Log
  await ModerationLog.create({
    postId: post._id,
    jobId: job.id,
    result: status,
    flagReasons
  });

}, { connection });

module.exports = moderationWorker;

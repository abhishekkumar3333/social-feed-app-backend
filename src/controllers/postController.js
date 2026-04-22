const Post = require('../models/Post');
const FeedItem = require('../models/FeedItem');
const Like = require('../models/Like');
const Follow = require('../models/Follow');
const Comment = require('../models/Comment');
const { moderationQueue, notificationQueue } = require('../queues');

// POST /api/posts - Create post
const createPost = async (req, res) => {
  const { content } = req.body;
  const mediaUrls = req.file ? [`/uploads/${req.file.filename}`] : [];

  if (!content && mediaUrls.length === 0) {
    return res.status(400).json({ message: 'Content or media is required' });
  }

  const post = await Post.create({
    authorId: req.user._id,
    content,
    mediaUrls,
    status: 'pending',
  });

  await moderationQueue.add(`mod-${post._id}`, { postId: post._id });

  res.status(202).json({
    message: 'Post submitted and under review',
    post,
  });
};

// GET /api/feed - Paginated ranked feed
const getFeed = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const lastScore = req.query.lastScore ? parseFloat(req.query.lastScore) : null;
  const lastId = req.query.lastId || null;

  let query = { userId: req.user._id };

  if (lastScore !== null && lastId !== null) {
    query.$or = [
      { score: { $lt: lastScore } },
      { score: lastScore, _id: { $lt: lastId } }
    ];
  }

  const feedItems = await FeedItem.find(query)
    .sort({ score: -1, _id: -1 })
    .limit(limit)
    .populate({
      path: 'postId',
      populate: { path: 'authorId', select: 'username displayName avatarUrl' }
    });

  const enrichedFeed = await Promise.all(feedItems.map(async (item) => {
    if (!item.postId) return null;
    const postObj = item.postId.toObject();
    if (!postObj.authorId) return null;
    
    const like = await Like.findOne({ userId: req.user._id, postId: postObj._id });
    postObj.isLiked = !!like;
    
    const isFollowing = await Follow.findOne({ followerId: req.user._id, followeeId: postObj.authorId._id });
    
    // Compatibility fields for frontend
    postObj.author = { ...postObj.authorId, isFollowing: !!isFollowing }; 
    postObj.image = postObj.mediaUrls[0] || null;
    postObj.likesCount = postObj.likeCount;
    postObj.commentsCount = 0;

    return { ...item.toObject(), post: postObj };
  }));

  let pendingFeedItems = [];
  if (lastScore === null && lastId === null) {
    const pendingPosts = await Post.find({
      authorId: req.user._id,
      status: { $in: ['pending', 'rejected'] }
    })
    .sort({ createdAt: -1 })
    .populate('authorId', 'username displayName avatarUrl');

    pendingFeedItems = pendingPosts.map(p => {
      const postObj = p.toObject();
      postObj.isLiked = false; // Just created, assume not liked
      postObj.author = { ...postObj.authorId, isFollowing: false }; // Own post
      postObj.image = postObj.mediaUrls[0] || null;
      postObj.likesCount = postObj.likeCount;
      postObj.commentsCount = 0;

      return {
        _id: p._id, // Use post ID as fake feedItem ID
        score: Infinity,
        post: postObj
      };
    });
  }

  res.json([...pendingFeedItems, ...enrichedFeed.filter(f => f !== null)]);
};

// GET /api/feed/explore - Top posts globally
const getExploreFeed = async (req, res) => {
  const posts = await Post.find({ status: 'approved' })
    .sort({ moderationScore: -1, createdAt: -1 })
    .limit(20)
    .populate('authorId', 'username displayName avatarUrl');

  const enriched = await Promise.all(posts.map(async (p) => {
    const postObj = p.toObject();
    if (!postObj.authorId) return null;
    const like = await Like.findOne({ userId: req.user._id, postId: postObj._id });
    postObj.isLiked = !!like;
    const isFollowing = await Follow.findOne({ followerId: req.user._id, followeeId: postObj.authorId._id });
    postObj.author = { ...postObj.authorId, isFollowing: !!isFollowing };
    postObj.image = postObj.mediaUrls[0] || null;
    postObj.likesCount = postObj.likeCount;
    postObj.commentsCount = 0;
    return postObj;
  }));

  res.json(enriched.filter(p => p !== null));
};

// GET /api/posts/:id - Post detail with nested comments
const getPostDetail = async (req, res) => {
  const post = await Post.findById(req.params.id).populate('authorId', 'username displayName avatarUrl');
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const postObj = post.toObject();
  if (!postObj.authorId) return res.status(404).json({ message: 'Post author not found' });
  const like = await Like.findOne({ userId: req.user._id, postId: postObj._id });
  postObj.isLiked = !!like;
  
  const isFollowing = await Follow.findOne({ followerId: req.user._id, followeeId: postObj.authorId._id });
  postObj.author = { ...postObj.authorId, isFollowing: !!isFollowing };
  
  postObj.image = postObj.mediaUrls[0] || null;
  postObj.likesCount = postObj.likeCount;
  postObj.commentsCount = postObj.commentCount;

  const comments = await Comment.find({ postId: post._id })
    .sort({ createdAt: 1 })
    .populate('authorId', 'username displayName avatarUrl');

  // Build a simple nested tree
  const commentMap = {};
  const tree = [];

  comments.forEach(c => {
    const obj = c.toObject();
    obj.replies = [];
    commentMap[obj._id] = obj;
  });

  comments.forEach(c => {
    const obj = commentMap[c._id];
    if (c.parentId) {
      if (commentMap[c.parentId]) commentMap[c.parentId].replies.push(obj);
    } else {
      tree.push(obj);
    }
  });

  res.json({ post: postObj, comments: tree });
};

// POST /api/posts/:id/like - Toggle like
const toggleLike = async (req, res) => {
  const postId = req.params.id;
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const alreadyLiked = await Like.findOne({ userId: req.user._id, postId });

  if (alreadyLiked) {
    await Like.deleteOne({ _id: alreadyLiked._id });
    post.likeCount = Math.max(0, post.likeCount - 1);
    await post.save();
    return res.json({ message: 'Unliked', likeCount: post.likeCount, isLiked: false });
  }

  await Like.create({ userId: req.user._id, postId });
  post.likeCount += 1;
  await post.save();

  if (post.authorId.toString() !== req.user._id.toString()) {
    await notificationQueue.add('like-notif', {
      recipientId: post.authorId,
      actorId: req.user._id,
      type: 'like',
      postId: post._id
    });
  }

  res.json({ message: 'Liked', likeCount: post.likeCount, isLiked: true });
};

// POST /api/posts/:id/comments - Add comment
const addComment = async (req, res) => {
  const { content, parentId } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const comment = await Comment.create({
    authorId: req.user._id,
    postId: post._id,
    parentId: parentId || null,
    content
  });

  post.commentCount += 1;
  await post.save();

  if (post.authorId.toString() !== req.user._id.toString()) {
    await notificationQueue.add('comment-notif', {
      recipientId: post.authorId,
      actorId: req.user._id,
      type: 'comment',
      postId: post._id
    });
  }

  res.status(201).json(comment);
};


// DELETE /api/posts/:id - Hard-delete
const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  // Hard delete post and associated data
  await Post.deleteOne({ _id: post._id });
  await FeedItem.deleteMany({ postId: post._id });
  await Like.deleteMany({ postId: post._id });
  await Comment.deleteMany({ postId: post._id });

  res.json({ message: 'Post completely removed' });
};

// Internal for Profile
const getUserPosts = async (req, res) => {
  let query = { authorId: req.params.id, status: 'approved' };
  
  if (req.user._id.toString() === req.params.id) {
    query = { authorId: req.params.id, status: { $in: ['approved', 'pending', 'rejected'] } };
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .populate('authorId', 'username displayName avatarUrl');
  
  const enriched = await Promise.all(posts.map(async (p) => {
    const postObj = p.toObject();
    if (!postObj.authorId) return null;
    const like = await Like.findOne({ userId: req.user._id, postId: postObj._id });
    postObj.isLiked = !!like;
    const isFollowing = await Follow.findOne({ followerId: req.user._id, followeeId: postObj.authorId._id });
    postObj.author = { ...postObj.authorId, isFollowing: !!isFollowing };
    postObj.image = postObj.mediaUrls[0] || null;
    postObj.likesCount = postObj.likeCount;
    postObj.commentsCount = 0;
    return postObj;
  }));
    
  res.json(enriched.filter(p => p !== null));
};

module.exports = {
  createPost,
  getFeed,
  getExploreFeed,
  getPostDetail,
  toggleLike,
  addComment,
  deletePost,
  getUserPosts
};

const express = require('express');
const router = express.Router();
const {
  createPost,
  getPostDetail,
  toggleLike,
  addComment,
  deletePost,
  getUserPosts
} = require('../controllers/postController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// POST /api/posts
router.post('/', protect, upload.single('image'), createPost);

// GET /api/posts/:id
router.get('/:id', protect, getPostDetail);

// DELETE /api/posts/:id
router.delete('/:id', protect, deletePost);

// POST /api/posts/:id/like
router.post('/:id/like', protect, toggleLike);

// POST /api/posts/:id/comments
router.post('/:id/comment', protect, addComment);
router.post('/:id/comments', protect, addComment); // Support both naming styles

// Profile specific posts
router.get('/user/:id', protect, getUserPosts);

module.exports = router;

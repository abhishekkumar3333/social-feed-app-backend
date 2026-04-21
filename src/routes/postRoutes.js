const express = require('express');
const router = express.Router();
const {
  createPost,
  getPostDetail,
  toggleLike,
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



// Profile specific posts
router.get('/user/:id', protect, getUserPosts);

module.exports = router;

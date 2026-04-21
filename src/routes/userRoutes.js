const express = require('express');
const router = express.Router();
const {
  toggleFollow,
  getUserProfile,
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

// GET /api/users/:id/profile
router.get('/:id/profile', protect, getUserProfile);
router.get('/:id', protect, getUserProfile); // For legacy support

// POST /api/users/:id/follow
router.post('/:id/follow', protect, toggleFollow);

module.exports = router;

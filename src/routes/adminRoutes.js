const express = require('express');
const router = express.Router();
const { getQueueStats } = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');
const { admin } = require('../middlewares/admin');

router.get('/queues', protect, admin, getQueueStats);

module.exports = router;

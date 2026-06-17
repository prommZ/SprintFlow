const express = require('express');
const router = express.Router();
const { createReview, getReviews, getTodayReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getReviews).post(createReview);
router.get('/today', getTodayReview);

module.exports = router;

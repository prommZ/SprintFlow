const express = require('express');
const router = express.Router();
const { createStandup, getStandups, getTodayStandup, deleteStandup } = require('../controllers/standupController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getStandups).post(createStandup);
router.get('/today', getTodayStandup);
router.delete('/:id', deleteStandup);

module.exports = router;

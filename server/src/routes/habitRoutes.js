const express = require('express');
const router = express.Router();
const {
  getHabits, createHabit, updateHabit, deleteHabit, completeHabit, getHabitStats
} = require('../controllers/habitController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getHabits).post(createHabit);
router.get('/stats', getHabitStats);
router.route('/:id').put(updateHabit).delete(deleteHabit);
router.post('/:id/complete', completeHabit);

module.exports = router;

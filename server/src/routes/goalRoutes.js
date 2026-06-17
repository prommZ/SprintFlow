const express = require('express');
const router = express.Router();
const {
  getGoals, createGoal, getGoal, updateGoal, deleteGoal,
  updateMilestones, linkTask, unlinkTask
} = require('../controllers/goalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getGoals).post(createGoal);
router.route('/:id').get(getGoal).put(updateGoal).delete(deleteGoal);
router.patch('/:id/milestones', updateMilestones);
router.post('/:id/link-task', linkTask);
router.delete('/:id/link-task/:taskId', unlinkTask);

module.exports = router;

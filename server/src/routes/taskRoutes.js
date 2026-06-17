const express = require('express');
const router = express.Router();
const {
  getTasks, createTask, getTask, updateTask, deleteTask,
  archiveTask, restoreTask, getArchivedTasks, reorderTasks, carryForward, getTodayTasks
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getTasks).post(createTask);
router.get('/today', getTodayTasks);
router.get('/archived', getArchivedTasks);
router.patch('/reorder', reorderTasks);
router.post('/carry-forward', carryForward);
router.post('/:id/archive', archiveTask);
router.post('/:id/restore', restoreTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.patch('/:id/archive', archiveTask); // Keep PATCH for backwards compatibility

module.exports = router;

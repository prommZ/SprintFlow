const express = require('express');
const router = express.Router();
const {
  getSprints, createSprint, getActiveSprint, getSprint,
  updateSprint, deleteSprint, completeSprint, getSprintMetrics
} = require('../controllers/sprintController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getSprints).post(createSprint);
router.get('/active', getActiveSprint);
router.route('/:id').get(getSprint).put(updateSprint).delete(deleteSprint);
router.post('/:id/complete', completeSprint);
router.get('/:id/metrics', getSprintMetrics);

module.exports = router;

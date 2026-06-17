const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics, getProductivityTrends,
  getWorkloadAnalysis, getSprintPerformance
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboardMetrics);
router.get('/productivity', getProductivityTrends);
router.get('/workload', getWorkloadAnalysis);
router.get('/sprint-performance', getSprintPerformance);

module.exports = router;

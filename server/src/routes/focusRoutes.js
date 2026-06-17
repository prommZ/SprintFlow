const express = require('express');
const router = express.Router();
const { startSession, endSession, getActiveSession, getSessions, getStats } = require('../controllers/focusController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/start', startSession);
router.post('/end', endSession);
router.get('/active', getActiveSession);
router.get('/sessions', getSessions);
router.get('/stats', getStats);

module.exports = router;

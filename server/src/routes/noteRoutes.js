const express = require('express');
const router = express.Router();
const { getNotes, createNote, getNote, updateNote, deleteNote, togglePin } = require('../controllers/noteController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getNotes).post(createNote);
router.route('/:id').get(getNote).put(updateNote).delete(deleteNote);
router.patch('/:id/pin', togglePin);

module.exports = router;

const Note = require('../models/Note');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/notes
 * @desc    Get all notes with filtering and search
 */
const getNotes = asyncHandler(async (req, res) => {
  const { category, search, tags, page = 1, limit = 20 } = req.query;
  const query = { user: req.user._id };

  if (category && category !== 'All') query.category = category;
  if (tags) query.tags = { $in: tags.split(',') };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notes, total] = await Promise.all([
    Note.find(query)
      .sort({ isPinned: -1, updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Note.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: notes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 */
const createNote = asyncHandler(async (req, res) => {
  req.body.user = req.user._id;
  const note = await Note.create(req.body);
  res.status(201).json({ success: true, data: note });
});

/**
 * @route   GET /api/notes/:id
 * @desc    Get single note
 */
const getNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  res.json({ success: true, data: note });
});

/**
 * @route   PUT /api/notes/:id
 * @desc    Update note
 */
const updateNote = asyncHandler(async (req, res) => {
  let note = await Note.findOne({ _id: req.params.id, user: req.user._id });

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  note = await Note.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({ success: true, data: note });
});

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete note
 */
const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  await Note.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Note deleted' });
});

/**
 * @route   PATCH /api/notes/:id/pin
 * @desc    Toggle pin/unpin note
 */
const togglePin = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  note.isPinned = !note.isPinned;
  await note.save();

  res.json({ success: true, data: note });
});

module.exports = { getNotes, createNote, getNote, updateNote, deleteNote, togglePin };

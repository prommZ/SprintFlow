const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Ideas', 'Study', 'Project', 'Meeting', 'General'],
    default: 'General'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#181C23'
  }
}, {
  timestamps: true
});

noteSchema.index({ user: 1, category: 1 });
noteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 });
noteSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Note', noteSchema);

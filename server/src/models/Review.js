const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  wentWell: {
    type: String,
    default: '',
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  distractions: {
    type: String,
    default: '',
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  improvements: {
    type: String,
    default: '',
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  completedCount: {
    type: Number,
    default: 0
  },
  pendingCount: {
    type: Number,
    default: 0
  },
  productivityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  focusHours: {
    type: Number,
    default: 0,
    min: 0
  },
  mood: {
    type: String,
    enum: ['great', 'good', 'okay', 'bad', 'terrible', null],
    default: null
  }
}, {
  timestamps: true
});

reviewSchema.index({ user: 1, date: -1 });
reviewSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

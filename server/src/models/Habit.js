const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot exceed 100 characters']
  },
  frequency: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly'],
    default: 'Daily'
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  color: {
    type: String,
    default: '#6366F1'
  },
  icon: {
    type: String,
    default: '📌'
  },
  completions: [{
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: true
    }
  }],
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  targetPerWeek: {
    type: Number,
    default: 7,
    min: 1,
    max: 7
  }
}, {
  timestamps: true
});

habitSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Habit', habitSchema);

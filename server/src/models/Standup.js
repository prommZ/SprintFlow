const mongoose = require('mongoose');

const standupSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  completedYesterday: {
    type: String,
    default: '',
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  planToday: {
    type: String,
    default: '',
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  blockers: {
    type: String,
    default: '',
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  }
}, {
  timestamps: true
});

standupSchema.index({ user: 1, date: -1 });
standupSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Standup', standupSchema);

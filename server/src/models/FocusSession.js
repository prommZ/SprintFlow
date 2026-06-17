const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null,
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number, // in minutes
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

focusSessionSchema.index({ userId: 1, startTime: -1 });
focusSessionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);

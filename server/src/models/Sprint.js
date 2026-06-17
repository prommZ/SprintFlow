const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true,
    maxlength: [100, 'Sprint name cannot exceed 100 characters']
  },
  goal: {
    type: String,
    default: '',
    maxlength: [500, 'Goal cannot exceed 500 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  status: {
    type: String,
    enum: ['Planning', 'Active', 'Completed', 'Cancelled'],
    default: 'Planning'
  },
  velocity: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  completedPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

sprintSchema.index({ user: 1, status: 1 });
sprintSchema.index({ user: 1, startDate: 1 });

module.exports = mongoose.model('Sprint', sprintSchema);

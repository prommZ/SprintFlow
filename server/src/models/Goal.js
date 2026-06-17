const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { _id: true });

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  deadline: {
    type: Date,
    default: null
  },
  milestones: [milestoneSchema],
  linkedTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Active'
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  color: {
    type: String,
    default: '#6366F1'
  }
}, {
  timestamps: true
});

goalSchema.index({ user: 1, status: 1 });

// Auto-calculate progress from milestones
goalSchema.methods.calculateProgress = function() {
  if (this.milestones.length === 0) return 0;
  const completed = this.milestones.filter(m => m.completed).length;
  this.progress = Math.round((completed / this.milestones.length) * 100);
  return this.progress;
};

module.exports = mongoose.model('Goal', goalSchema);

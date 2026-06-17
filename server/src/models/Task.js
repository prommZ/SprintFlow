const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'inprogress', 'review', 'done'],
    default: 'todo'
  },
  dueDate: {
    type: Date,
    default: null
  },
  startTime: {
    type: String,
    default: null
  },
  endTime: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    default: '',
    maxlength: [5000, 'Notes cannot exceed 5000 characters']
  },
  estimatedHours: {
    type: Number,
    default: 0,
    min: 0
  },
  actualHours: {
    type: Number,
    default: 0,
    min: 0
  },
  sprint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    default: null
  },
  eisenhowerCategory: {
    type: String,
    enum: ['urgent-important', 'important', 'urgent', 'later', null],
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  previousStatus: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: null
  },
  carriedForward: {
    type: Boolean,
    default: false
  },
  originalDueDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, sprint: 1 });
taskSchema.index({ user: 1, isArchived: 1, status: 1 });
taskSchema.index({ user: 1, eisenhowerCategory: 1 });

// Set completedAt when status changes to done
taskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.isModified('status') && this.status !== 'done') {
    this.completedAt = null;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);

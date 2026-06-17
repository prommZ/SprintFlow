const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/tasks', require('./src/routes/taskRoutes'));
app.use('/api/sprints', require('./src/routes/sprintRoutes'));
app.use('/api/standups', require('./src/routes/standupRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/habits', require('./src/routes/habitRoutes'));
app.use('/api/goals', require('./src/routes/goalRoutes'));
app.use('/api/notes', require('./src/routes/noteRoutes'));
app.use('/api/focus', require('./src/routes/focusRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SprintFlow API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
//console.log("MONGO_URI =", process.env.MONGO_URI);
app.listen(PORT, () => {
  console.log(`\n🚀 SprintFlow API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✓ MongoDB connected: ${conn.connection.host}`);

    // Run task status migration to lowercase values
    const Task = require('../models/Task');
    const statusMap = {
      'Backlog': 'backlog',
      'To Do': 'todo',
      'In Progress': 'inprogress',
      'Review': 'review',
      'Done': 'done'
    };

    for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
      const result = await Task.updateMany({ status: oldStatus }, { $set: { status: newStatus } });
      if (result.modifiedCount > 0) {
        console.log(`[Migration] Converted ${result.modifiedCount} tasks from "${oldStatus}" to "${newStatus}"`);
      }
    }

    // Migrate boardOrder to order for existing tasks
    const migrateResult = await Task.updateMany(
      { order: { $exists: false } },
      [ { $set: { order: { $ifNull: [ '$boardOrder', 0 ] } } } ]
    );
    if (migrateResult.modifiedCount > 0) {
      console.log(`[Migration] Migrated ${migrateResult.modifiedCount} tasks to have the 'order' field`);
    }

    // Migrate FocusSession model fields
    const FocusSession = require('../models/FocusSession');
    const fsMigrateResult = await FocusSession.updateMany(
      { userId: { $exists: false } },
      [
        {
          $set: {
            userId: { $ifNull: [ '$user', null ] },
            taskId: { $ifNull: [ '$task', null ] },
            durationMinutes: { $ifNull: [ '$duration', 0 ] },
            date: { $ifNull: [ '$startTime', new Date() ] }
          }
        }
      ]
    );
    if (fsMigrateResult.modifiedCount > 0) {
      console.log(`[Migration] Migrated ${fsMigrateResult.modifiedCount} focus sessions to the new schema`);
    }

    // Migrate Task archive fields
    const taskArchiveResult = await Task.updateMany(
      { archived: { $exists: false } },
      [
        {
          $set: {
            archived: { $ifNull: [ '$isArchived', false ] },
            archivedAt: { $cond: [ { $eq: [ '$isArchived', true ] }, new Date(), null ] },
            previousStatus: { $ifNull: [ '$status', 'todo' ] }
          }
        }
      ]
    );
    if (taskArchiveResult.modifiedCount > 0) {
      console.log(`[Migration] Migrated ${taskArchiveResult.modifiedCount} tasks to have the new archive fields`);
    }
  } catch (error) {
    console.error(`✗ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

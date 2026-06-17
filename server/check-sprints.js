const mongoose = require('mongoose');
const Sprint = require('./src/models/Sprint');
const Task = require('./src/models/Task');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const sprints = await Sprint.find();
  console.log(`Found ${sprints.length} sprints:`);
  for (const s of sprints) {
    const taskCount = await Task.countDocuments({ sprint: s._id });
    console.log(`Sprint: ${s.name}
    - ID: ${s._id}
    - Status: ${s.status}
    - Start Date: ${s.startDate}
    - End Date: ${s.endDate}
    - Tasks linked: ${taskCount}`);
  }

  await mongoose.disconnect();
}

test().catch(console.error);

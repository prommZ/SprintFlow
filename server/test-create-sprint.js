const mongoose = require('mongoose');
const Sprint = require('./src/models/Sprint');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const mockUserId = new mongoose.Types.ObjectId();
  const sprint = await Sprint.create({
    user: mockUserId,
    name: 'Test Sprint 1',
    startDate: new Date(Date.now() + 86400000), // tomorrow
    endDate: new Date(Date.now() + 2 * 86400000) // day after tomorrow
  });

  console.log("Created Sprint:", sprint);
  
  await Sprint.findByIdAndDelete(sprint._id);
  console.log("Deleted test sprint");
  await mongoose.disconnect();
}

test().catch(console.error);

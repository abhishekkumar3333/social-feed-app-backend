const mongoose = require('mongoose');

const dropStaleIndexes = async (db) => {
  const likeIndexes = await db.collection('likes').indexes();
  const hasStaleIndex = likeIndexes.some((i) => i.name === 'user_1_post_1');
  if (hasStaleIndex) {
    await db.collection('likes').dropIndex('user_1_post_1');
    console.log('[Migration] Dropped stale likes index: user_1_post_1');
  }
};

const removeBrokenUsers = async (db) => {
  const broken = await db.collection('users').find({
    password: { $exists: true, $not: /^\$2[aby]\$/ },
  }).toArray();

  if (broken.length > 0) {
    const ids = broken.map((u) => u._id);
    await db.collection('users').deleteMany({ _id: { $in: ids } });
    console.log(`[Migration] Removed ${ids.length} user(s) with un-hashed passwords`);
  }
};

const runMigrations = async () => {
  try {
    const db = mongoose.connection.db;
    await dropStaleIndexes(db);
    await removeBrokenUsers(db);
  } catch (err) {
    console.warn('[Migration] Warning during startup migration:', err.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await runMigrations();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

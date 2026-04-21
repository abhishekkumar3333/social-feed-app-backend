const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL.startsWith('rediss://')
    ? { rejectUnauthorized: false }
    : undefined
});

connection.on('connect', () => {
  console.log('Redis Connected Successfully ✅');
});

connection.on('error', (err) => {
  console.error('Redis Error ❌:', err.message);
});

module.exports = { connection };
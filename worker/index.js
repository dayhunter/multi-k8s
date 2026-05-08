const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  socket: {
    host: keys.redisHost,
    port: keys.redisPort,
    reconnectStrategy: () => 1000
  },
  password: keys.redisPassword || undefined
});

redisClient.on('error', (err) => console.error('Redis Client Error', err.message));

// Iterative fibonacci - prevents stack overflow and DoS
function fib(index) {
  if (index < 2) return 1;
  let prev = 1;
  let curr = 1;
  for (let i = 2; i <= index; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}

async function start() {
  await redisClient.connect();

  const subscriber = redisClient.duplicate();
  subscriber.on('error', (err) => console.error('Redis Subscriber Error', err.message));
  await subscriber.connect();

  await subscriber.subscribe('insert', (message) => {
    const index = parseInt(message, 10);
    if (!isNaN(index) && index >= 0 && index <= 40) {
      redisClient.hSet('values', String(index), String(fib(index)));
    }
  });

  console.log('Worker listening for messages');
}

start().catch((err) => {
  console.error('Worker failed to start:', err.message);
  process.exit(1);
});

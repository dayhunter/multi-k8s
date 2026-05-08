const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Restrict CORS to specific origins (configure via environment variable)
const allowedOrigins = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigins === '*' ? true : allowedOrigins.split(','),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json({ limit: '1mb' }));

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
pgClient.on('error', (err) => console.error('Lost PG connection', err.message));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.error('PG init error:', err.message));

// Redis Client Setup (redis v4+ uses createClient differently)
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
redisClient.connect().catch(console.error);

const redisPublisher = redisClient.duplicate();
redisPublisher.on('error', (err) => console.error('Redis Publisher Error', err.message));
redisPublisher.connect().catch(console.error);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Express route handlers
app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  try {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
  } catch (err) {
    console.error('Error fetching all values:', err.message);
    res.status(500).json({ error: 'Failed to fetch values' });
  }
});

app.get('/values/current', async (req, res) => {
  try {
    const values = await redisClient.hGetAll('values');
    res.send(values);
  } catch (err) {
    console.error('Error fetching current values:', err.message);
    res.status(500).json({ error: 'Failed to fetch current values' });
  }
});

app.post('/values', async (req, res) => {
  try {
    const index = req.body.index;

    // Strict input validation: must be a non-negative integer <= 40
    const parsedIndex = parseInt(index, 10);
    if (isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex > 40 || String(parsedIndex) !== String(index)) {
      return res.status(422).json({ error: 'Index must be a non-negative integer between 0 and 40' });
    }

    await redisClient.hSet('values', String(parsedIndex), 'Nothing yet!');
    await redisPublisher.publish('insert', String(parsedIndex));
    await pgClient.query('INSERT INTO values(number) VALUES($1)', [parsedIndex]);

    res.send({ working: true });
  } catch (err) {
    console.error('Error posting value:', err.message);
    res.status(500).json({ error: 'Failed to process value' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(5000, () => {
  console.log('Listening on port 5000');
});

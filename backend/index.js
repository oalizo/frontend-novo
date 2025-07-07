require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3007;

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(bodyParser.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500
});
app.use(limiter);

// Database connection test
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL database successfully!');
    console.log(`📍 Host: ${process.env.DB_HOST}`);
    console.log(`📚 Database: ${process.env.DB_NAME}`);
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
  });

// Import routes
require('./routes/products')(app, pool);
require('./routes/productRefresh')(app, pool);
require('./routes/orders')(app, pool);
require('./routes/logistics')(app, pool);
require('./routes/inventory')(app, pool);
require('./routes/returns')(app, pool);
require('./routes/dashboard')(app, pool);
require('./routes/coupon')(app, pool);
require('./routes/amazonCredentials')(app, pool);
require('./routes/blacklist')(app, pool);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  pool.end(() => {
    console.log('Database connection pool closed');
    process.exit(0);
  });
});

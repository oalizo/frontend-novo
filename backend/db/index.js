const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test database connection
pool.connect()
  .then(client => {
    logger.info('✅ Connected to PostgreSQL database successfully!');
    logger.info(`📍 Host: ${process.env.DB_HOST}`);
    logger.info(`📚 Database: ${process.env.DB_NAME}`);
    client.release();
  })
  .catch(err => {
    logger.error('❌ Database connection error:', err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};

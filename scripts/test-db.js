require('dotenv').config();
const { Pool } = require('pg');

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  console.log('DB Configuration:');
  console.log('- Host:', process.env.DB_HOST);
  console.log('- Port:', process.env.DB_PORT);
  console.log('- Database:', process.env.DB_NAME);
  console.log('- User:', process.env.DB_USER);
  console.log('- Password:', process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing');

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('\n🚀 Attempting database connection...');
    const client = await pool.connect();
    
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT COUNT(*) as count FROM amazon_credentials WHERE store_id = $1', ['OMD']);
    console.log('Amazon credentials found:', result.rows[0].count);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  }
}

testDatabase();

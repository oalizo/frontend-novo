import { Pool } from 'pg'

// Create connection pool with proper error handling
const pool = new Pool({
  user: process.env.DB_USER || 'postgres.bvbnofnnbfdlnpuswlgy',
  host: process.env.DB_HOST || 'aws-0-us-east-1.pooler.supabase.com', 
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'vARlryN1VJN3WGEa',
  port: Number(process.env.DB_PORT) || 6543,
  ssl: {
    rejectUnauthorized: false
  },
  // Add connection error handling
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection and handle errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Export connection pool
export default pool
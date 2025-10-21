const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

function createPool() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    // Prevent connection timeout
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  console.log('✅ MySQL connection pool created');

  // Test the connection
  pool.getConnection()
    .then(connection => {
      console.log('✅ MySQL connected successfully');
      connection.release();
    })
    .catch(err => {
      console.error('❌ MySQL connection error:', err.message);
    });

  return pool;
}

// Initialize pool on startup
createPool();

// Keep connection alive
setInterval(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
  } catch (err) {
    console.error('⚠️ MySQL ping failed:', err.message);
  }
}, 60000); // ping every 60 seconds

// Test connection function
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log('✅ Database connection verified');
    return true;
  } catch (err) {
    console.error('❌ Database connection test failed:', err.message);
    throw err;
  }
};

module.exports = pool;
module.exports.testConnection = testConnection;
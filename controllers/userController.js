const db = require('../config/db');

// Create users table if it doesn't exist
const createUsersTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      whatsapp_number VARCHAR(20),
      location VARCHAR(255) NOT NULL,
      user_type ENUM('manpower', 'equipment_owner', 'both') NOT NULL,
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      reset_token VARCHAR(255),
      reset_token_expiry TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      INDEX idx_email (email),
      INDEX idx_user_type (user_type),
      INDEX idx_location (location),
      INDEX idx_mobile (mobile_number),
      INDEX idx_name (first_name, last_name)
    )
  `;

  try {
    await db.query(createTableQuery);
    console.log('✅ Users table created or already exists');
  } catch (error) {
    console.error('❌ Error creating users table:', error);
    throw error;
  }
};

// Initialize table on module load
(async () => {
  try {
    await createUsersTable();
  } catch (error) {
    console.error('Failed to initialize users table:', error);
  }
})();

// Create user in users table (called by manpower/equipment controllers)
const createUser = async (userData) => {
  const {
    first_name,
    last_name,
    email,
    password,
    mobile_number,
    whatsapp_number,
    location,
    user_type
  } = userData;

  try {
    const insertQuery = `
      INSERT INTO users 
      (first_name, last_name, email, password, mobile_number, whatsapp_number, location, user_type, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
    `;

    const [result] = await db.query(insertQuery, [
      first_name,
      last_name,
      email,
      password,
      mobile_number,
      whatsapp_number || mobile_number,
      location,
      user_type
    ]);

    console.log(`✅ User created in users table: ${email} (ID: ${result.insertId}, type: ${user_type})`);
    return { success: true, userId: result.insertId };
  } catch (error) {
    console.error('❌ Error creating user in users table:', error);
    throw error;
  }
};

// Get user by email (used by login controller)
const getUserByEmail = async (email) => {
  try {
    const [users] = await db.query(
      `SELECT id, first_name, last_name, email, password, mobile_number, whatsapp_number, 
              location, user_type, is_active, email_verified, 
              created_at, last_login
       FROM users 
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('❌ Error fetching user by email:', error);
    throw error;
  }
};

// Get user by ID (used by various controllers)
const getUserById = async (id) => {
  try {
    const [users] = await db.query(
      `SELECT id, first_name, last_name, email, mobile_number, whatsapp_number, 
              location, user_type, is_active, email_verified, 
              created_at, updated_at, last_login
       FROM users 
       WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('❌ Error fetching user by ID:', error);
    throw error;
  }
};

// Update last login timestamp
const updateLastLogin = async (userId) => {
  try {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
    console.log(`✅ Last login updated for user: ${userId}`);
  } catch (error) {
    console.error('❌ Error updating last login:', error);
    throw error;
  }
};

// Check if email exists (used during registration validation)
const checkEmailExists = async (email) => {
  try {
    const [users] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    return users.length > 0;
  } catch (error) {
    console.error('❌ Error checking email existence:', error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateLastLogin,
  checkEmailExists
};
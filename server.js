
// ====================================
// server.js (Updated)
// ====================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database connection
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const manpowerRoutes = require('./routes/manpowerRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes'); 
const manpowerSearchRoutes = require('./routes/manpowerSearchRoutes');
const equipmentSearchRoutes = require('./routes/equipmentSearchRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const bothRoutes = require('./routes/bothRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');

const { createReviewsTable } = require("./controllers/reviewController");

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests (for debugging)
app.use((req, res, next) => {
  console.log(`🔥 ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/manpower', manpowerRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/manpower-search', manpowerSearchRoutes);
app.use('/api/equipment-search', equipmentSearchRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/both', bothRoutes);
app.use('/api/inquiry', inquiryRoutes);


// Initialize reviews table on startup
createReviewsTable().catch(err => {
  console.error('❌ Failed to create reviews table:', err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    await db.testConnection();
    res.status(200).json({
      success: true,
      message: 'Database connection successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.url,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5550;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📋 API Base: http://localhost:${PORT}/api`);
  console.log(`📋 Available routes:`);
  console.log(`   AUTH:`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/forgot-password`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/reset-password/:token`);
  console.log(`   MANPOWER:`);
  console.log(`   - POST http://localhost:${PORT}/api/manpower/signup`);
  console.log(`   - GET  http://localhost:${PORT}/api/manpower/profile`);
  console.log(`   - PUT  http://localhost:${PORT}/api/manpower/profile`);
  console.log(`   EQUIPMENT:`);
  console.log(`   - POST http://localhost:${PORT}/api/equipment/signup`);
  console.log(`   - GET  http://localhost:${PORT}/api/equipment/profile`);
  console.log(`   - PUT  http://localhost:${PORT}/api/equipment/profile`);
  console.log(`   - POST http://localhost:${PORT}/api/equipment/add`);
  console.log(`   - PUT  http://localhost:${PORT}/api/equipment/update/:id`);
  console.log(`   - DELETE http://localhost:${PORT}/api/equipment/delete/:id`);
  console.log(`   REVIEWS:`);
  console.log(`   - GET  http://localhost:${PORT}/api/reviews (public)`);
  console.log(`   - GET  http://localhost:${PORT}/api/reviews/stats (public)`);
  console.log(`   - GET  http://localhost:${PORT}/api/reviews/my-review (protected)`);
  console.log(`   - POST http://localhost:${PORT}/api/reviews (protected)`);
  console.log(`   - PUT  http://localhost:${PORT}/api/reviews/:id (protected)`);
  console.log(`   - DELETE http://localhost:${PORT}/api/reviews/:id (protected)`);
});
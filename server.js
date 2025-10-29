// ====================================
// server.js (Windows HTTPS Version)
// ====================================
const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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

// ==========================================
// CORS Configuration - FIXED
// ==========================================
const corsOptions = {
  origin: 'https://findhiref.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly with same options
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests (for debugging)
app.use((req, res, next) => {
  console.log(`🔥 ${req.method} ${req.url} - Origin: ${req.get('origin') || 'none'}`);
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
    timestamp: new Date().toISOString(),
    protocol: req.protocol
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
const USE_HTTPS = process.env.USE_HTTPS === 'true';

if (USE_HTTPS) {
  // HTTPS Server
  const sslKeyPath = path.join(__dirname, 'ssl', 'server.key');
  const sslCertPath = path.join(__dirname, 'ssl', 'server.crt');

  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };

    https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 HTTPS Server running on port ${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📋 API Base: https://122.165.58.206:${PORT}/api`);
      console.log(`✅ SSL Certificate loaded successfully`);
      console.log(`⚠️  Users will see a certificate warning (self-signed)`);
      console.log(`🌐 Listening on all network interfaces (0.0.0.0)`);
    });
  } else {
    console.error('❌ SSL certificates not found!');
    console.error(`   Run: node generate-cert.js`);
    process.exit(1);
  }
} else {
  // HTTP Server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`📋 API Base: http://122.165.58.206:${PORT}/api`);
    console.log(`✅ CORS configured for: https://findhiref.netlify.app`);
    console.log(`🌐 Listening on all network interfaces (0.0.0.0)`);
  });
}
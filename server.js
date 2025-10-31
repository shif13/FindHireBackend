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
const bothRoutes = require('./routes/bothRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');

// Initialize express app
const app = express();

// ==========================================
// CORS Configuration - FIXED FOR DEVELOPMENT & PRODUCTION
// ==========================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://findhirer.netlify.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      // In development, allow all origins
      callback(null, true); // Change to false in production for security
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
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
app.use('/api/both', bothRoutes);
app.use('/api/inquiry', inquiryRoutes);

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
      console.log(`✅ CORS configured for localhost development`);
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
    console.log(`📋 API Base: http://localhost:${PORT}/api`);
    console.log(`✅ CORS configured for localhost development`);
    console.log(`🌐 Listening on all network interfaces (0.0.0.0)`);
  });
}
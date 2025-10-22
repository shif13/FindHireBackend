// routes/bothRoutes.js
const express = require('express');
const router = express.Router();
const { uploadFields } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { 
  createBothAccount,
  getBothProfiles,
  updateManpowerProfile,
  updateEquipmentProfile
} = require('../controllers/bothController');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// POST /api/both/signup - Create account with both profiles
router.post('/signup', uploadFields, createBothAccount);

// ==========================================
// PROTECTED ROUTES (Require Authentication)
// ==========================================

// GET /api/both/profile - Get both profiles (manpower + equipment)
router.get('/profile', authenticateToken, getBothProfiles);

// PUT /api/both/manpower-profile - Update manpower profile
router.put('/manpower-profile', authenticateToken, uploadFields, updateManpowerProfile);

// PUT /api/both/equipment-profile - Update equipment owner profile
router.put('/equipment-profile', authenticateToken, updateEquipmentProfile);

module.exports = router;
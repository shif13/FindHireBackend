// routes/manpowerRoutes.js
const express = require('express');
const router = express.Router();
const { uploadFields } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { 
  createManpowerAccount, 
  getProfile, 
  updateProfile 
} = require('../controllers/manpowerController');

// Public routes
router.post('/signup', uploadFields, createManpowerAccount);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, uploadFields, updateProfile);

module.exports = router;
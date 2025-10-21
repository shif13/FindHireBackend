// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  login,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
  logout
} = require('../controllers/loginController');

// POST /api/auth/login - User login
router.post('/login', login);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', forgotPassword);

// GET /api/auth/verify-reset-token/:token - Verify reset token
router.get('/verify-reset-token/:token', verifyResetToken);

// POST /api/auth/reset-password/:token - Reset password with token
router.post('/reset-password/:token', resetPassword);

// POST /api/auth/change-password - Change password (requires authentication)
router.post('/change-password', authenticateToken, changePassword);

// POST /api/auth/logout - Logout user
router.post('/logout', authenticateToken, logout);

module.exports = router;
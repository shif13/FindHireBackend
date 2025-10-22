// routes/equipmentRoutes.js
const express = require('express');
const router = express.Router();
const { uploadFields } = require('../middleware/upload');
const { authenticateToken, checkUserType } = require('../middleware/auth');
const { 
  createEquipmentOwnerAccount,
  getEquipmentOwnerProfile,
  updateEquipmentOwnerProfile,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  getOwnerProfile
} = require('../controllers/equipmentController');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// POST /api/equipment/signup - Equipment owner signup
router.post('/signup', uploadFields, createEquipmentOwnerAccount);

// GET /api/equipment-search/owner-profile/:userId - Get owner profile by user ID
router.get('/owner-profile/:userId', getOwnerProfile);

// ==========================================
// PROTECTED ROUTES (Require Authentication)
// ==========================================

// GET /api/equipment/profile - Get equipment owner profile and equipment list
router.get('/profile', authenticateToken, getEquipmentOwnerProfile);

// PUT /api/equipment/profile - Update equipment owner profile
router.put('/profile', authenticateToken, uploadFields, updateEquipmentOwnerProfile);

// POST /api/equipment/add - Add new equipment (FIXED ENDPOINT)
router.post('/add', authenticateToken, addEquipment);

// PUT /api/equipment/update/:id - Update equipment (FIXED ENDPOINT)
router.put('/update/:id', authenticateToken, updateEquipment);

// DELETE /api/equipment/delete/:id - Delete equipment (FIXED ENDPOINT)
router.delete('/delete/:id', authenticateToken, deleteEquipment);

// ==========================================
// ALTERNATIVE RESTFUL ROUTES (Keep for backward compatibility)
// ==========================================

// POST /api/equipment - Add new equipment
router.post('/', authenticateToken, addEquipment);

// PUT /api/equipment/:id - Update equipment
router.put('/:id', authenticateToken, updateEquipment);

// DELETE /api/equipment/:id - Delete equipment
router.delete('/:id', authenticateToken, deleteEquipment);

module.exports = router;
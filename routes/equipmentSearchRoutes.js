// routes/equipmentSearchRoutes.js
const express = require('express');
const router = express.Router();
const {
  searchEquipment,
  getLocations,
  getEquipmentStats,
  getEquipmentById
} = require('../controllers/equipmentSearchController');

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

// GET /api/equipment-search/search - Search and filter equipment
router.get('/search', searchEquipment);

// GET /api/equipment-search/locations - Get all unique locations
router.get('/locations', getLocations);

// GET /api/equipment-search/stats - Get equipment statistics
router.get('/stats', getEquipmentStats);

// GET /api/equipment-search/:id - Get equipment by ID
router.get('/:id', getEquipmentById);

module.exports = router;
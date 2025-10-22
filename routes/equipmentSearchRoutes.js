const express = require('express');
const router = express.Router();
const {
  searchEquipment,
  getLocations,
  getEquipmentStats,
  getEquipmentById
} = require('../controllers/equipmentSearchController');

// Import getOwnerProfile from equipmentController
const { getOwnerProfile } = require('../controllers/equipmentController');

// GET /api/equipment-search/search
router.get('/search', searchEquipment);

// GET /api/equipment-search/locations
router.get('/locations', getLocations);

// GET /api/equipment-search/stats
router.get('/stats', getEquipmentStats);

// GET /api/equipment-search/owner-profile/:userId - ADD THIS
router.get('/owner-profile/:userId', getOwnerProfile);


// GET /api/equipment-search/:id
router.get('/:id', getEquipmentById);

module.exports = router;
// routes/manpowerSearchRoutes.js
const express = require('express');
const router = express.Router();
const {
  searchManpower,
  getManpowerDetails,
  getSearchStats,
  getProfessionalCategories,
  getFeaturedManpower
} = require('../controllers/manpowerSearchController');

// Public search routes
router.post('/search', searchManpower);
router.get('/details/:manpowerId', getManpowerDetails);
router.get('/stats', getSearchStats);
router.get('/categories', getProfessionalCategories);
router.get('/featured', getFeaturedManpower);

module.exports = router;
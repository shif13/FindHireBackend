// routes/inquiry.js
const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');

// Send inquiry to manpower professional
router.post('/manpower', inquiryController.sendManpowerInquiry);

// Send inquiry to equipment owner
router.post('/equipment', inquiryController.sendEquipmentInquiry);

module.exports = router;
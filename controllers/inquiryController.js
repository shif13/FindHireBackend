const db = require('../config/db');
const emailService = require('../services/emailService');

// ==========================================
// SEND INQUIRY TO MANPOWER
// ==========================================
const sendManpowerInquiry = async (req, res) => {
  try {
    const { manpowerId, name, email, phone, message, subject } = req.body;

    // Validation
    if (!manpowerId || !name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide manpower ID, name, email, and message'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    console.log('📧 Processing manpower inquiry:', { manpowerId, name, email });

    // Get manpower details
    const [manpower] = await db.query(
      'SELECT first_name, last_name, email, job_title FROM manpower_profiles WHERE id = ?',
      [manpowerId]
    );

    if (manpower.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Manpower profile not found'
      });
    }

    const profile = manpower[0];

    // Send emails to both parties
    await Promise.all([
      // Email to manpower professional
      emailService.sendManpowerInquiryEmail(
        {
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          jobTitle: profile.job_title
        },
        { name, email, phone, message, subject }
      ),
      // Confirmation email to inquirer
      emailService.sendInquiryConfirmationEmail(
        { email, name },
        {
          firstName: profile.first_name,
          lastName: profile.last_name,
          jobTitle: profile.job_title
        },
        'manpower'
      )
    ]);

    console.log('✅ Manpower inquiry emails sent successfully');

    res.status(200).json({
      success: true,
      message: 'Your inquiry has been sent successfully! The professional will contact you soon.'
    });

  } catch (error) {
    console.error('❌ Manpower inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending inquiry. Please try again later.',
      error: error.message
    });
  }
};

// ==========================================
// SEND INQUIRY TO EQUIPMENT OWNER
// ==========================================
const sendEquipmentInquiry = async (req, res) => {
  try {
    const { equipmentId, name, email, phone, message, subject } = req.body;

    // Validation
    if (!equipmentId || !name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide equipment ID, name, email, and message'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    console.log('📧 Processing equipment inquiry:', { equipmentId, name, email });

    // Get equipment and owner details
    const [equipment] = await db.query(
      `SELECT 
        e.equipment_name, 
        e.equipment_type, 
        e.user_id,
        eop.email, 
        eop.name, 
        eop.company_name
       FROM equipment e
       JOIN equipment_owner_profiles eop ON e.user_id = eop.user_id
       WHERE e.id = ?`,
      [equipmentId]
    );

    if (equipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    const eq = equipment[0];

    // Send emails to both parties
    await Promise.all([
      // Email to equipment owner
      emailService.sendEquipmentInquiryEmail(
        {
          email: eq.email,
          name: eq.name,
          companyName: eq.company_name
        },
        {
          equipmentName: eq.equipment_name,
          equipmentType: eq.equipment_type
        },
        { name, email, phone, message, subject }
      ),
      // Confirmation email to inquirer
      emailService.sendInquiryConfirmationEmail(
        { email, name },
        {
          equipmentName: eq.equipment_name,
          ownerName: eq.name
        },
        'equipment'
      )
    ]);

    console.log('✅ Equipment inquiry emails sent successfully');

    res.status(200).json({
      success: true,
      message: 'Your inquiry has been sent successfully! The owner will contact you soon.'
    });

  } catch (error) {
    console.error('❌ Equipment inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending inquiry. Please try again later.',
      error: error.message
    });
  }
};

module.exports = {
  sendManpowerInquiry,
  sendEquipmentInquiry
};
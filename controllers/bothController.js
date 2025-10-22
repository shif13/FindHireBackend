const db = require('../config/db');
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { createUser, checkEmailExists } = require('../controllers/userController');
const emailService = require('../services/emailService');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'both_profiles',
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });
    
    fs.unlinkSync(filePath);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// ==========================================
// CREATE "BOTH" ACCOUNT (SIGNUP)
// ==========================================
const createBothAccount = async (req, res) => {
  console.log('🎯 createBothAccount called');
  console.log('📦 Body:', req.body);
  console.log('📎 Files:', req.files);

  try {
    const {
      // Common fields
      name,
      email,
      password,
      location,
      mobileNumber,
      whatsappNumber,
      
      // Manpower fields (optional)
      jobTitle,
      availabilityStatus,
      availableFrom,
      rate,
      profileDescription,
      
      // Equipment fields (optional)
      companyName
    } = req.body;

    // Validation - Common fields (REQUIRED)
    if (!name || !email || !password || !mobileNumber || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required common fields (name, email, password, mobile, location)'
      });
    }

    // Check if at least ONE profile has data
    const hasManpowerData = jobTitle && jobTitle.trim() !== '';
    const hasEquipmentData = companyName && companyName.trim() !== '';

    if (!hasManpowerData && !hasEquipmentData) {
      return res.status(400).json({
        success: false,
        message: 'Please fill at least one profile (Freelancer or Equipment Owner)'
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

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle file uploads
    let profilePhotoUrl = null;
    let cvPath = null;
    let certificatePaths = [];

    if (req.files) {
      // Profile photo (shared for both profiles)
      const photoFile = req.files.find(f => f.fieldname === 'profilePhoto');
      if (photoFile) {
        try {
          profilePhotoUrl = await uploadToCloudinary(photoFile.path);
          console.log('✅ Profile photo uploaded:', profilePhotoUrl);
        } catch (error) {
          console.error('❌ Error uploading photo:', error);
        }
      }

      // CV (stored locally - only for manpower)
      const cvFile = req.files.find(f => f.fieldname === 'cv');
      if (cvFile) {
        cvPath = cvFile.path;
        console.log('📄 CV saved at:', cvPath);
      }

      // Certificates (stored locally - only for manpower)
      const certFiles = req.files.filter(f => f.fieldname === 'certificates');
      if (certFiles.length > 0) {
        certificatePaths = certFiles.map(file => file.path);
        console.log('🏆 Certificates saved:', certificatePaths.length, 'files');
      }
    }

    // Auto-fill WhatsApp with mobile if not provided
    const finalWhatsappNumber = whatsappNumber || mobileNumber;

    // Split name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Step 1: Create user in users table
    console.log('👤 Creating user in users table...');
    const userResult = await createUser({
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
      mobile_number: mobileNumber,
      whatsapp_number: finalWhatsappNumber,
      location,
      user_type: 'both'
    });

    const userId = userResult.userId;
    console.log('✅ User created with ID:', userId);

    // Step 2: ALWAYS create manpower profile with basic info
    console.log('💼 Creating manpower profile...');
    await db.query(
      `INSERT INTO manpower_profiles 
      (user_id, first_name, last_name, email, mobile_number, whatsapp_number, location, 
       job_title, availability_status, available_from, rate, profile_description, 
       profile_photo, cv_path, certificates) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        firstName,
        lastName,
        email,
        mobileNumber,
        finalWhatsappNumber,
        location,
        jobTitle || null, // NULL if not provided
        availabilityStatus || 'available',
        availableFrom || null,
        rate || null,
        profileDescription || null,
        profilePhotoUrl,
        cvPath,
        JSON.stringify(certificatePaths)
      ]
    );
    console.log('✅ Manpower profile created');

    // Step 3: ALWAYS create equipment owner profile with basic info
    console.log('🏢 Creating equipment owner profile...');
    await db.query(
      `INSERT INTO equipment_owner_profiles 
      (user_id, name, email, mobile_number, whatsapp_number, location, company_name, profile_photo, equipment_count) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        userId,
        name,
        email,
        mobileNumber,
        finalWhatsappNumber,
        location,
        companyName || null, // NULL if not provided
        profilePhotoUrl
      ]
    );
    console.log('✅ Equipment owner profile created');

    console.log(`🎉 Both account created: ${email} (User ID: ${userId})`);

    // Send welcome email
try {
  await emailService.sendWelcomeEmail({
    email,
    firstName,
    lastName,
    userType: 'both'
  });
  console.log('✅ Welcome email sent to:', email);
} catch (emailError) {
  console.error('⚠️ Welcome email failed:', emailError.message);
}

    res.status(201).json({
      success: true,
      message: 'Account created successfully with both profiles',
      userId: userId,
      profiles: {
        manpower: true, // Always created
        equipment: true  // Always created
      }
    });

  } catch (error) {
    console.error('❌ Both signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
};

// ==========================================
// GET BOTH PROFILES
// ==========================================
const getBothProfiles = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('🔍 Fetching both profiles for user:', userId);

    // Get manpower profile
    const [manpowerProfiles] = await db.query(
      `SELECT * FROM manpower_profiles WHERE user_id = ?`,
      [userId]
    );

    // Get equipment owner profile
    const [equipmentProfiles] = await db.query(
      `SELECT * FROM equipment_owner_profiles WHERE user_id = ?`,
      [userId]
    );

    // Get equipment list
    const [equipment] = await db.query(
      `SELECT * FROM equipment WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // Parse JSON fields
    let manpowerProfile = null;
    if (manpowerProfiles.length > 0) {
      manpowerProfile = manpowerProfiles[0];
      try {
        manpowerProfile.certificates = JSON.parse(manpowerProfile.certificates || '[]');
      } catch (e) {
        manpowerProfile.certificates = [];
      }
    }

    let equipmentProfile = null;
    if (equipmentProfiles.length > 0) {
      equipmentProfile = equipmentProfiles[0];
    }

    const equipmentList = equipment.map(eq => {
      let parsedImages = [];
      try {
        if (Buffer.isBuffer(eq.equipment_images)) {
          parsedImages = JSON.parse(eq.equipment_images.toString('utf8'));
        } else if (typeof eq.equipment_images === 'string' && eq.equipment_images.trim()) {
          parsedImages = JSON.parse(eq.equipment_images);
        } else if (Array.isArray(eq.equipment_images)) {
          parsedImages = eq.equipment_images;
        }
      } catch (e) {
        parsedImages = [];
      }
      return { ...eq, equipment_images: parsedImages };
    });

    console.log(`✅ Profiles fetched - Manpower: ${!!manpowerProfile}, Equipment: ${!!equipmentProfile}`);

    res.status(200).json({
      success: true,
      manpowerProfile,
      equipmentProfile,
      equipment: equipmentList
    });

  } catch (error) {
    console.error('Get both profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE MANPOWER PROFILE (from dashboard)
// ==========================================
const updateManpowerProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('📝 Updating manpower profile for user:', userId);

    const {
      firstName,
      lastName,
      jobTitle,
      availabilityStatus,
      availableFrom,
      location,
      rate,
      mobileNumber,
      whatsappNumber,
      profileDescription
    } = req.body;

    // Get current profile
    const [currentProfile] = await db.query(
      'SELECT * FROM manpower_profiles WHERE user_id = ?',
      [userId]
    );

    if (currentProfile.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const current = currentProfile[0];

    // Handle profile photo update
    let profilePhotoUrl = current.profile_photo;
    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      try {
        console.log('📸 Uploading new profile photo...');
        
        // Delete old photo from Cloudinary if exists
        if (current.profile_photo) {
          const matches = current.profile_photo.match(/\/both_profiles\/([^\.]+)/);
          if (matches && matches[1]) {
            const publicId = `both_profiles/${matches[1]}`;
            await cloudinary.uploader.destroy(publicId);
          }
        }
        
        profilePhotoUrl = await uploadToCloudinary(req.files.profilePhoto[0].path);
        console.log('✅ New profile photo uploaded:', profilePhotoUrl);

        // Also update equipment_owner_profiles with same photo
        await db.query(
          'UPDATE equipment_owner_profiles SET profile_photo = ? WHERE user_id = ?',
          [profilePhotoUrl, userId]
        );
      } catch (error) {
        console.error('❌ Error updating profile photo:', error);
      }
    }

    // Update manpower profile
    await db.query(
      `UPDATE manpower_profiles 
       SET first_name = ?, last_name = ?, job_title = ?, availability_status = ?,
           available_from = ?, location = ?, rate = ?, mobile_number = ?,
           whatsapp_number = ?, profile_description = ?, profile_photo = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [
        firstName || current.first_name,
        lastName || current.last_name,
        jobTitle || current.job_title,
        availabilityStatus || current.availability_status,
        availableFrom || current.available_from,
        location || current.location,
        rate || current.rate,
        mobileNumber || current.mobile_number,
        whatsappNumber || current.whatsapp_number,
        profileDescription !== undefined ? profileDescription : current.profile_description,
        profilePhotoUrl,
        userId
      ]
    );

    // Also update users table and equipment_owner_profiles with basic info
    await db.query(
      `UPDATE users 
       SET first_name = ?, last_name = ?, mobile_number = ?,
           whatsapp_number = ?, location = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        firstName || current.first_name,
        lastName || current.last_name,
        mobileNumber || current.mobile_number,
        whatsappNumber || current.whatsapp_number,
        location || current.location,
        userId
      ]
    );

    await db.query(
      `UPDATE equipment_owner_profiles 
       SET name = ?, mobile_number = ?, whatsapp_number = ?, location = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [
        `${firstName || current.first_name} ${lastName || current.last_name}`.trim(),
        mobileNumber || current.mobile_number,
        whatsappNumber || current.whatsapp_number,
        location || current.location,
        userId
      ]
    );

    console.log('✅ Profile updated successfully');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE EQUIPMENT OWNER PROFILE (from dashboard)
// ==========================================
const updateEquipmentProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('📝 Updating equipment owner profile for user:', userId);

    const { companyName } = req.body;

    // Update equipment_owner_profiles
    await db.query(
      `UPDATE equipment_owner_profiles 
       SET company_name = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [companyName, userId]
    );

    console.log('✅ Equipment owner profile updated successfully');

    res.status(200).json({
      success: true,
      message: 'Equipment owner profile updated successfully'
    });

  } catch (error) {
    console.error('❌ Update equipment profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating equipment profile',
      error: error.message
    });
  }
};

module.exports = {
  createBothAccount,
  getBothProfiles,
  updateManpowerProfile,
  updateEquipmentProfile
};
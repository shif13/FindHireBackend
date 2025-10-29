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

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    const matches = imageUrl.match(/\/both_profiles\/([^\.]+)/);
    if (matches && matches[1]) {
      const publicId = `both_profiles/${matches[1]}`;
      await cloudinary.uploader.destroy(publicId);
      console.log('🗑️ Deleted image from Cloudinary:', publicId);
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Helper function to delete local files
const deleteLocalFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted local file:', filePath);
    }
  } catch (error) {
    console.error('Error deleting local file:', error);
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
        jobTitle || null,
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
        companyName || null,
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
        manpower: true,
        equipment: true
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
// UPDATE BASIC INFO (Updates all 3 tables)
// ==========================================
const updateBasicInfo = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('📝 Updating basic info for user:', userId);
    console.log('📦 Body:', req.body);
    console.log('📎 Files:', req.files);

    const {
      firstName,
      lastName,
      phone,
      whatsapp,
      location
    } = req.body;

    // Get current profiles
    const [currentManpower] = await db.query(
      'SELECT * FROM manpower_profiles WHERE user_id = ?',
      [userId]
    );

    const [currentEquipment] = await db.query(
      'SELECT * FROM equipment_owner_profiles WHERE user_id = ?',
      [userId]
    );

    if (currentManpower.length === 0 || currentEquipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const manpower = currentManpower[0];
    const equipment = currentEquipment[0];

    // Handle profile photo update
    let profilePhotoUrl = manpower.profile_photo;
    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      try {
        console.log('📸 Uploading new profile photo...');
        
        // Delete old photo from Cloudinary if exists
        if (manpower.profile_photo) {
          await deleteFromCloudinary(manpower.profile_photo);
        }
        
        profilePhotoUrl = await uploadToCloudinary(req.files.profilePhoto[0].path);
        console.log('✅ New profile photo uploaded:', profilePhotoUrl);
      } catch (error) {
        console.error('❌ Error updating profile photo:', error);
      }
    }

    const fullName = `${firstName || manpower.first_name} ${lastName || manpower.last_name}`.trim();

    // Update users table
    await db.query(
      `UPDATE users 
       SET first_name = ?, last_name = ?, mobile_number = ?,
           whatsapp_number = ?, location = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        firstName || manpower.first_name,
        lastName || manpower.last_name,
        phone || manpower.mobile_number,
        whatsapp || manpower.whatsapp_number,
        location || manpower.location,
        userId
      ]
    );

    // Update manpower_profiles
    await db.query(
      `UPDATE manpower_profiles 
       SET first_name = ?, last_name = ?, mobile_number = ?,
           whatsapp_number = ?, location = ?, profile_photo = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [
        firstName || manpower.first_name,
        lastName || manpower.last_name,
        phone || manpower.mobile_number,
        whatsapp || manpower.whatsapp_number,
        location || manpower.location,
        profilePhotoUrl,
        userId
      ]
    );

    // Update equipment_owner_profiles
    await db.query(
      `UPDATE equipment_owner_profiles 
       SET name = ?, mobile_number = ?, whatsapp_number = ?, 
           location = ?, profile_photo = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        fullName,
        phone || equipment.mobile_number,
        whatsapp || equipment.whatsapp_number,
        location || equipment.location,
        profilePhotoUrl,
        userId
      ]
    );

    console.log('✅ Basic info updated in all 3 tables');

    res.status(200).json({
      success: true,
      message: 'Basic info updated successfully'
    });

  } catch (error) {
    console.error('❌ Update basic info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating basic info',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE MANPOWER PROFILE (Only manpower_profiles table)
// ==========================================
const updateManpowerProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('📝 Updating manpower profile for user:', userId);
    console.log('📦 Body:', req.body);
    console.log('📎 Files:', req.files);

    const {
      jobTitle,
      availabilityStatus,
      availableFrom,
      rate,
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
        message: 'Manpower profile not found'
      });
    }

    const current = currentProfile[0];

    // Handle CV update
    let cvPath = current.cv_path;
    if (req.files && req.files.cv && req.files.cv[0]) {
      console.log('📄 Updating CV...');
      
      // Delete old CV
      if (current.cv_path) {
        deleteLocalFile(current.cv_path);
      }
      
      cvPath = req.files.cv[0].path;
      console.log('✅ New CV saved:', cvPath);
    }

    // Handle certificates update
    let certificatePaths = [];
    try {
      certificatePaths = current.certificates ? JSON.parse(current.certificates) : [];
    } catch (e) {
      certificatePaths = [];
    }

    if (req.files && req.files.certificates && req.files.certificates.length > 0) {
      console.log('🏆 Adding new certificates...');
      
      const newCertificates = req.files.certificates.map(file => file.path);
      certificatePaths = [...certificatePaths, ...newCertificates];
      
      console.log('✅ Total certificates:', certificatePaths.length);
    }

    // Update ONLY manpower_profiles table
    await db.query(
      `UPDATE manpower_profiles 
       SET job_title = ?, availability_status = ?, available_from = ?,
           rate = ?, profile_description = ?, cv_path = ?, 
           certificates = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        jobTitle || current.job_title,
        availabilityStatus || current.availability_status,
        availableFrom || current.available_from,
        rate || current.rate,
        profileDescription !== undefined ? profileDescription : current.profile_description,
        cvPath,
        JSON.stringify(certificatePaths),
        userId
      ]
    );

    console.log('✅ Manpower profile updated successfully');

    res.status(200).json({
      success: true,
      message: 'Professional profile updated successfully'
    });

  } catch (error) {
    console.error('❌ Update manpower profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating professional profile',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE EQUIPMENT OWNER PROFILE (Only equipment_owner_profiles table)
// ==========================================
const updateEquipmentProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('📝 Updating equipment owner profile for user:', userId);
    console.log('📦 Body:', req.body);

    const { companyName } = req.body;

    // Get current profile
    const [currentProfile] = await db.query(
      'SELECT * FROM equipment_owner_profiles WHERE user_id = ?',
      [userId]
    );

    if (currentProfile.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment owner profile not found'
      });
    }

    // Update ONLY equipment_owner_profiles table
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
  updateBasicInfo,
  updateManpowerProfile,
  updateEquipmentProfile
};
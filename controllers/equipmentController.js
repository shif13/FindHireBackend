const db = require('../config/db');
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { createUser, checkEmailExists } = require('./userController');

// ==========================================
// CREATE EQUIPMENT OWNER PROFILES TABLE
// ==========================================
const createEquipmentOwnerProfilesTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS equipment_owner_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      whatsapp_number VARCHAR(20),
      location VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      profile_photo VARCHAR(500),
      equipment_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_email (email),
      INDEX idx_location (location),
      INDEX idx_company (company_name)
    )
  `;

  try {
    await db.query(createTableQuery);
    console.log('✅ Equipment owner profiles table created or already exists');
  } catch (error) {
    console.error('❌ Error creating equipment owner profiles table:', error);
    throw error;
  }
};

// ==========================================
// CREATE EQUIPMENT TABLE (Individual Listings)
// ==========================================
const createEquipmentTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS equipment (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      equipment_name VARCHAR(255) NOT NULL,
      equipment_type VARCHAR(100) NOT NULL,
      availability ENUM('available', 'on-hire') DEFAULT 'available',
      location VARCHAR(255),
      contact_person VARCHAR(200) NOT NULL,
      contact_number VARCHAR(20) NOT NULL,
      contact_email VARCHAR(255) NOT NULL,
      description TEXT,
      equipment_images JSON,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_equipment_type (equipment_type),
      INDEX idx_availability (availability),
      INDEX idx_location (location)
    )
  `;

  try {
    await db.query(createTableQuery);
    console.log('✅ Equipment table created or already exists');
  } catch (error) {
    console.error('❌ Error creating equipment table:', error);
    throw error;
  }
};

// Initialize both tables on module load
(async () => {
  try {
    await createEquipmentOwnerProfilesTable();
    await createEquipmentTable();
  } catch (error) {
    console.error('Failed to initialize equipment tables:', error);
  }
})();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Upload image to Cloudinary
const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'equipment_images',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 900, crop: 'fill' },
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

// Upload profile photo
const uploadProfilePhoto = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'equipment_owner_profiles',
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

// Delete from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    const matches = imageUrl.match(/\/(equipment_images|equipment_owner_profiles)\/([^\.]+)/);
    if (matches && matches[1] && matches[2]) {
      const publicId = `${matches[1]}/${matches[2]}`;
      await cloudinary.uploader.destroy(publicId);
      console.log('🗑️ Deleted image from Cloudinary:', publicId);
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// ==========================================
// CREATE EQUIPMENT OWNER ACCOUNT (SIGNUP)
// ==========================================
const createEquipmentOwnerAccount = async (req, res) => {
  console.log('🎯 createEquipmentOwnerAccount called');
  console.log('📦 Body:', req.body);
  console.log('📎 Files:', req.files);

  try {
    const {
      name,
      email,
      password,
      companyName,
      location,
      mobileNumber,
      whatsappNumber
    } = req.body;

    // Validation
    if (!name || !email || !password || !mobileNumber || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
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

    // Handle profile photo upload to Cloudinary
    let profilePhotoUrl = null;
    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      try {
        console.log('📸 Uploading profile photo to Cloudinary...');
        profilePhotoUrl = await uploadProfilePhoto(req.files.profilePhoto[0].path);
        console.log('✅ Profile photo uploaded:', profilePhotoUrl);
      } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error uploading profile photo'
        });
      }
    }

    // Auto-fill WhatsApp with mobile if not provided
    const finalWhatsappNumber = whatsappNumber || mobileNumber;

    // Step 1: Create user in users table
    console.log('👤 Creating user in users table...');
    const userResult = await createUser({
      first_name: name.split(' ')[0] || name,
      last_name: name.split(' ').slice(1).join(' ') || '',
      email,
      password: hashedPassword,
      mobile_number: mobileNumber,
      whatsapp_number: finalWhatsappNumber,
      location,
      user_type: 'equipment_owner'
    });

    const userId = userResult.userId;
    console.log('✅ User created with ID:', userId);

    // Step 2: Create equipment owner profile
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

    console.log(`✅ Equipment owner account created: ${email} (User ID: ${userId})`);

    res.status(201).json({
      success: true,
      message: 'Equipment owner account created successfully',
      userId: userId
    });

  } catch (error) {
    console.error('❌ Equipment owner signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
};

// ==========================================
// GET EQUIPMENT OWNER PROFILE & EQUIPMENT LIST
// ==========================================
const getEquipmentOwnerProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('🔍 Fetching equipment owner profile for user:', userId);

    // Get owner profile
    const [profiles] = await db.query(
      `SELECT eop.*, u.is_active, u.email_verified, u.created_at as account_created
       FROM equipment_owner_profiles eop
       JOIN users u ON eop.user_id = u.id
       WHERE eop.user_id = ?`,
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const profile = profiles[0];

    // Get equipment list
    const [equipment] = await db.query(
      `SELECT * FROM equipment WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // Parse JSON fields safely
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
        console.error('Error parsing equipment images:', e);
        parsedImages = [];
      }

      return {
        ...eq,
        equipment_images: parsedImages
      };
    });

    console.log(`✅ Profile and ${equipmentList.length} equipment items fetched`);

    res.status(200).json({
      success: true,
      profile,
      equipment: equipmentList
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE EQUIPMENT OWNER PROFILE
// ==========================================
const updateEquipmentOwnerProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('🔄 Updating equipment owner profile for user:', userId);
    console.log('📦 Body:', req.body);
    console.log('📎 Files:', req.files);

    const {
      name,
      companyName,
      location,
      mobileNumber,
      whatsappNumber
    } = req.body;

    // Get current profile
    const [currentProfile] = await db.query(
      'SELECT * FROM equipment_owner_profiles WHERE user_id = ?',
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
        
        // Delete old photo from Cloudinary
        if (current.profile_photo) {
          await deleteFromCloudinary(current.profile_photo);
        }
        
        // Upload new photo
        profilePhotoUrl = await uploadProfilePhoto(req.files.profilePhoto[0].path);
        console.log('✅ New profile photo uploaded:', profilePhotoUrl);
      } catch (error) {
        console.error('❌ Error updating profile photo:', error);
      }
    }

    // Update equipment owner profile
    await db.query(
      `UPDATE equipment_owner_profiles 
       SET name = ?, company_name = ?, location = ?, mobile_number = ?,
           whatsapp_number = ?, profile_photo = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        name || current.name,
        companyName || current.company_name,
        location || current.location,
        mobileNumber || current.mobile_number,
        whatsappNumber || current.whatsapp_number,
        profilePhotoUrl,
        userId
      ]
    );

    // Also update users table
    await db.query(
      `UPDATE users 
       SET first_name = ?, mobile_number = ?, whatsapp_number = ?, location = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name || current.name,
        mobileNumber || current.mobile_number,
        whatsappNumber || current.whatsapp_number,
        location || current.location,
        userId
      ]
    );

    console.log('✅ Equipment owner profile updated successfully');

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
// ADD EQUIPMENT (From Dashboard - Frontend sends Cloudinary URLs)
// ==========================================
const addEquipment = async (req, res) => {
  const userId = req.user.userId;
  const startTime = Date.now();

  try {
    console.log('➕ Adding equipment for user:', userId);
    console.log('📦 Body:', req.body);

    const {
      equipmentName,
      equipmentType,
      availability,
      location,
      contactPerson,
      contactNumber,
      contactEmail,
      description,
      equipmentImages // Array of Cloudinary URLs from frontend
    } = req.body;

    // Validation
    if (!equipmentName || !equipmentType || !contactPerson || !contactNumber || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid contact email'
      });
    }

    console.log('📸 Images provided:', equipmentImages?.length || 0);

    // Insert equipment
    const [result] = await db.query(
      `INSERT INTO equipment 
      (user_id, equipment_name, equipment_type, availability, location, 
       contact_person, contact_number, contact_email, description, equipment_images) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        equipmentName.trim(),
        equipmentType.trim(),
        availability || 'available',
        location ? location.trim() : null,
        contactPerson.trim(),
        contactNumber.trim(),
        contactEmail.trim().toLowerCase(),
        description ? description.trim() : null,
        JSON.stringify(equipmentImages || [])
      ]
    );

    // Increment equipment_count in equipment_owner_profiles
    await db.query(
      'UPDATE equipment_owner_profiles SET equipment_count = equipment_count + 1 WHERE user_id = ?',
      [userId]
    );

    const responseTime = Date.now() - startTime;
    console.log(`✅ Equipment added with ID: ${result.insertId} in ${responseTime}ms`);

    res.status(201).json({
      success: true,
      message: 'Equipment added successfully!',
      equipment: {
        id: result.insertId,
        equipmentName: equipmentName.trim(),
        equipmentType: equipmentType.trim(),
        availability: availability || 'available',
        equipmentImages: equipmentImages || []
      },
      processingTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('❌ Add equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding equipment',
      error: error.message
    });
  }
};

// ==========================================
// UPDATE EQUIPMENT (Frontend sends Cloudinary URLs)
// ==========================================
const updateEquipment = async (req, res) => {
  const userId = req.user.userId;
  const equipmentId = req.params.id;

  try {
    console.log('🔄 Updating equipment:', equipmentId);

    const {
      equipmentName,
      equipmentType,
      availability,
      location,
      contactPerson,
      contactNumber,
      contactEmail,
      description,
      equipmentImages // Array of Cloudinary URLs from frontend
    } = req.body;

    // Check if equipment belongs to user
    const [equipment] = await db.query(
      'SELECT * FROM equipment WHERE id = ? AND user_id = ?',
      [equipmentId, userId]
    );

    if (equipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found or access denied'
      });
    }

    // Update equipment
    await db.query(
      `UPDATE equipment 
       SET equipment_name = ?, equipment_type = ?, availability = ?,
           location = ?, contact_person = ?, contact_number = ?,
           contact_email = ?, description = ?, equipment_images = ?,
           updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        equipmentName ? equipmentName.trim() : null,
        equipmentType ? equipmentType.trim() : null,
        availability || 'available',
        location ? location.trim() : null,
        contactPerson ? contactPerson.trim() : null,
        contactNumber ? contactNumber.trim() : null,
        contactEmail ? contactEmail.trim().toLowerCase() : null,
        description ? description.trim() : null,
        JSON.stringify(equipmentImages || []),
        equipmentId,
        userId
      ]
    );

    console.log('✅ Equipment updated successfully');

    res.status(200).json({
      success: true,
      message: 'Equipment updated successfully'
    });

  } catch (error) {
    console.error('❌ Update equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating equipment',
      error: error.message
    });
  }
};

// ==========================================
// DELETE EQUIPMENT
// ==========================================
const deleteEquipment = async (req, res) => {
  const userId = req.user.userId;
  const equipmentId = req.params.id;

  try {
    console.log('🗑️ Deleting equipment:', equipmentId);

    // Check if equipment belongs to user
    const [equipment] = await db.query(
      'SELECT equipment_images FROM equipment WHERE id = ? AND user_id = ?',
      [equipmentId, userId]
    );

    if (equipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found or access denied'
      });
    }

    // Delete equipment photos from Cloudinary
    try {
      let images = [];
      if (Buffer.isBuffer(equipment[0].equipment_images)) {
        images = JSON.parse(equipment[0].equipment_images.toString('utf8'));
      } else if (typeof equipment[0].equipment_images === 'string') {
        images = JSON.parse(equipment[0].equipment_images);
      } else if (Array.isArray(equipment[0].equipment_images)) {
        images = equipment[0].equipment_images;
      }

      for (const imageUrl of images) {
        await deleteFromCloudinary(imageUrl);
      }
    } catch (e) {
      console.error('Error deleting equipment images:', e);
    }

    // Delete equipment
    await db.query(
      'DELETE FROM equipment WHERE id = ? AND user_id = ?',
      [equipmentId, userId]
    );

    // Decrement equipment_count
    await db.query(
      'UPDATE equipment_owner_profiles SET equipment_count = GREATEST(equipment_count - 1, 0) WHERE user_id = ?',
      [userId]
    );

    console.log('✅ Equipment deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Equipment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting equipment',
      error: error.message
    });
  }
};

module.exports = {
  createEquipmentOwnerAccount,
  getEquipmentOwnerProfile,
  updateEquipmentOwnerProfile,
  addEquipment,
  updateEquipment,
  deleteEquipment
};
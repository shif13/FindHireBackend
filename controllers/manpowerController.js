const db = require('../config/db');
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path'); // Add this import
const { createUser, checkEmailExists } = require('./userController');
const emailService = require('../services/emailService');

// Create manpower_profiles table if it doesn't exist
const createManpowerTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS manpower_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      whatsapp_number VARCHAR(20),
      location VARCHAR(255) NOT NULL,
      job_title VARCHAR(255) NOT NULL,
      availability_status ENUM('available', 'busy') NOT NULL DEFAULT 'available',
      available_from DATE,
      rate VARCHAR(100),
      profile_description TEXT,
      profile_photo VARCHAR(500),
      cv_path VARCHAR(500),
      certificates JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_email (email),
      INDEX idx_job_title (job_title),
      INDEX idx_availability (availability_status),
      INDEX idx_location (location),
      INDEX idx_name (first_name, last_name)
    )
  `;

  try {
    await db.query(createTableQuery);
    console.log('✅ Manpower profiles table created or already exists');
  } catch (error) {
    console.error('❌ Error creating manpower profiles table:', error);
    throw error;
  }
};

// Initialize table on module load
(async () => {
  try {
    await createManpowerTable();
  } catch (error) {
    console.error('Failed to initialize manpower profiles table:', error);
  }
})();

// Helper function to upload image to Cloudinary from file path
const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'manpower_profiles',
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });
    
    // Delete the local file after uploading to Cloudinary
    fs.unlinkSync(filePath);
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract public_id from Cloudinary URL
    const matches = imageUrl.match(/\/manpower_profiles\/([^\.]+)/);
    if (matches && matches[1]) {
      const publicId = `manpower_profiles/${matches[1]}`;
      await cloudinary.uploader.destroy(publicId);
      console.log('🗑️ Deleted old image from Cloudinary:', publicId);
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Helper function to delete local files - Updated
const deleteLocalFile = (filename) => {
  try {
    if (!filename) return;
    
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted local file:', filename);
    }
  } catch (error) {
    console.error('Error deleting local file:', error);
  }
};

// Create Manpower Account
const createManpowerAccount = async (req, res) => {
  console.log('🎯 createManpowerAccount called');
  console.log('📦 Body:', req.body);
  console.log('📎 Files:', req.files);

  try {
    const {
      firstName,
      lastName,
      email,
      password,
      jobTitle,
      availabilityStatus,
      availableFrom,
      location,
      rate,
      mobileNumber,
      whatsappNumber,
      profileDescription
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !jobTitle || !availabilityStatus || !mobileNumber || !location) {
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
    if (req.files) {
      const photoFile = req.files.find(f => f.fieldname === 'profilePhoto');
      if (photoFile) {
        try {
          console.log('📸 Uploading profile photo to Cloudinary...');
          profilePhotoUrl = await uploadToCloudinary(photoFile.path);
          console.log('✅ Profile photo uploaded:', profilePhotoUrl);
        } catch (error) {
          console.error('❌ Cloudinary upload error:', error);
        }
      }
    }

    // Handle CV upload (stored locally) - Store only filename
    let cvPath = null;
    if (req.files) {
      const cvFile = req.files.find(f => f.fieldname === 'cv');
      if (cvFile) {
        // Store only the filename, not the full path
        cvPath = cvFile.filename;
        console.log('📄 CV saved:', cvPath);
      }
    }

    // Handle certificates upload (stored locally) - Store only filenames
    let certificatePaths = [];
    if (req.files) {
      const certFiles = req.files.filter(f => f.fieldname === 'certificates');
      if (certFiles.length > 0) {
        // Store only filenames, not full paths
        certificatePaths = certFiles.map(file => file.filename);
        console.log('🏆 Certificates saved:', certificatePaths.length, 'files');
      }
    }

    // Auto-fill WhatsApp with mobile if not provided
    const finalWhatsappNumber = whatsappNumber || mobileNumber;

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
      user_type: 'manpower'
    });

    const userId = userResult.userId;
    console.log('✅ User created with ID:', userId);

    // Step 2: Create manpower profile
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
        jobTitle,
        availabilityStatus,
        availableFrom || null,
        rate || null,
        profileDescription || null,
        profilePhotoUrl,
        cvPath,
        JSON.stringify(certificatePaths)
      ]
    );

    console.log(`✅ Manpower account created: ${email} (User ID: ${userId})`);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail({
        email,
        firstName,
        lastName,
        userType: 'manpower'
      });
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Welcome email failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Manpower account created successfully',
      userId: userId
    });

  } catch (error) {
    console.error('❌ Manpower signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
};

const getProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('🔍 Fetching profile for user ID:', userId);

    const [profiles] = await db.query(
      `SELECT mp.*, u.is_active, u.email_verified, u.created_at as account_created
       FROM manpower_profiles mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.user_id = ?`,
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const profile = profiles[0];
    
    // Parse certificates JSON safely
    let parsedCertificates = [];
    if (profile.certificates) {
      try {
        if (typeof profile.certificates === 'string') {
          parsedCertificates = JSON.parse(profile.certificates);
        } else if (Array.isArray(profile.certificates)) {
          parsedCertificates = profile.certificates;
        } else if (Buffer.isBuffer(profile.certificates)) {
          parsedCertificates = JSON.parse(profile.certificates.toString('utf8'));
        }
      } catch (e) {
        console.error('Error parsing certificates:', e);
        parsedCertificates = [];
      }
    }
    
    // Convert filenames to full URLs (only if they're not already URLs)
    // The cv_path and certificates should only contain filenames now
    profile.certificates = parsedCertificates;

    console.log('✅ Profile data prepared:', {
      user_id: profile.user_id,
      name: `${profile.first_name} ${profile.last_name}`,
      has_photo: !!profile.profile_photo,
      has_cv: !!profile.cv_path,
      cv_filename: profile.cv_path,
      certificates_count: parsedCertificates.length
    });

    res.status(200).json({
      success: true,
      profile: profile
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// Update Manpower Profile - ENHANCED VERSION
const updateProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log('📝 Update profile called for user:', userId);
    console.log('📦 Body:', req.body);
    console.log('📎 Files:', req.files);

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
      profileDescription,
      removePhoto,
      removeCv,
      deleteCertificates
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

    // Handle profile photo update/removal
    let profilePhotoUrl = current.profile_photo;
    
    if (removePhoto === 'true') {
      // Remove photo
      if (current.profile_photo) {
        await deleteFromCloudinary(current.profile_photo);
      }
      profilePhotoUrl = null;
      console.log('🗑️ Profile photo removed');
    } else if (req.files) {
      const photoFile = req.files.find(f => f.fieldname === 'profilePhoto');
      if (photoFile) {
        try {
          console.log('📸 Uploading new profile photo...');
          
          // Delete old photo from Cloudinary
          if (current.profile_photo) {
            await deleteFromCloudinary(current.profile_photo);
          }
          
          // Upload new photo
          profilePhotoUrl = await uploadToCloudinary(photoFile.path);
          console.log('✅ New profile photo uploaded:', profilePhotoUrl);
        } catch (error) {
          console.error('❌ Error updating profile photo:', error);
        }
      }
    }

    // Handle CV update/removal
    let cvPath = current.cv_path;
    
    if (removeCv === 'true') {
      // Remove CV
      if (current.cv_path) {
        deleteLocalFile(current.cv_path);
      }
      cvPath = null;
      console.log('🗑️ CV removed');
    } else if (req.files) {
      const cvFile = req.files.find(f => f.fieldname === 'cv');
      if (cvFile) {
        console.log('📄 Updating CV...');
        
        // Delete old CV
        if (current.cv_path) {
          deleteLocalFile(current.cv_path);
        }
        
        cvPath = cvFile.filename; // Store only filename
        console.log('✅ New CV saved:', cvPath);
      }
    }

    // Handle certificates update and deletion
    let certificatePaths = [];
    try {
      certificatePaths = current.certificates ? JSON.parse(current.certificates) : [];
    } catch (e) {
      certificatePaths = [];
    }

    // Delete marked certificates
    if (deleteCertificates) {
      try {
        const certsToDelete = JSON.parse(deleteCertificates);
        console.log('🗑️ Deleting certificates:', certsToDelete);
        
        certsToDelete.forEach(certPath => {
          deleteLocalFile(certPath);
        });
        
        // Remove from array
        certificatePaths = certificatePaths.filter(cert => !certsToDelete.includes(cert));
        console.log('✅ Certificates deleted, remaining:', certificatePaths.length);
      } catch (e) {
        console.error('Error processing certificate deletions:', e);
      }
    }

    // Add new certificates
    if (req.files) {
      const certFiles = req.files.filter(f => f.fieldname === 'certificates');
      if (certFiles.length > 0) {
        console.log('🏆 Adding new certificates...');
        
        const newCertificates = certFiles.map(file => file.filename); // Store only filenames
        certificatePaths = [...certificatePaths, ...newCertificates];
        
        console.log('✅ Total certificates:', certificatePaths.length);
      }
    }

    // Update manpower profile
    await db.query(
      `UPDATE manpower_profiles 
       SET first_name = ?, last_name = ?, job_title = ?, availability_status = ?,
           available_from = ?, location = ?, rate = ?, mobile_number = ?,
           whatsapp_number = ?, profile_description = ?, profile_photo = ?,
           cv_path = ?, certificates = ?, updated_at = NOW()
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
        cvPath,
        JSON.stringify(certificatePaths),
        userId
      ]
    );

    // Also update users table
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

module.exports = {
  createManpowerAccount,
  getProfile,
  updateProfile
};
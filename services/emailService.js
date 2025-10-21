// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your-email@gmail.com
    pass: process.env.EMAIL_PASSWORD // your app password from Google
  }
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service configuration error:', error);
  } else {
    console.log('✅ Email service is ready to send emails');
  }
});

// ==========================================
// HELPER FUNCTION - Send Email
// ==========================================
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"ProFetch" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==========================================
// 1. WELCOME EMAIL (After Signup)
// ==========================================
const sendWelcomeEmail = async (user) => {
  const subject = '🎉 Welcome to ProFetch!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #0d9488; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Welcome to ProFetch! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.firstName}!</h2>
          <p>Thank you for joining ProFetch - your one-stop platform for freelance talent and equipment hire.</p>
          
          <p><strong>Your account has been created successfully!</strong></p>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Login to your account</li>
            <li>Select your role (Freelancer, Equipment Owner, or Both)</li>
            <li>Complete your profile</li>
            <li>Start connecting with opportunities!</li>
          </ol>
          
          <p><strong>Account Details:</strong></p>
          <ul>
            <li><strong>Username:</strong> ${user.userName}</li>
            <li><strong>Email:</strong> ${user.email}</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login to Your Account</a>
          </div>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ProFetch. All rights reserved.</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// 2. ROLE SELECTION CONFIRMATION
// ==========================================
const sendRoleSelectionEmail = async (user) => {
  let roleText = '';
  let roleSteps = '';

  if (user.isFreelancer && user.isEquipmentOwner) {
    roleText = 'Both Freelancer and Equipment Owner';
    roleSteps = `
      <p><strong>As a Freelancer, you'll need to:</strong></p>
      <ul>
        <li>Add your job title and experience</li>
        <li>Upload your CV/Resume</li>
        <li>Add professional certificates</li>
        <li>Set your availability</li>
      </ul>
      
      <p><strong>As an Equipment Owner, you'll need to:</strong></p>
      <ul>
        <li>Add your equipment listings</li>
        <li>Upload equipment photos</li>
        <li>Set availability status</li>
        <li>Add contact details</li>
      </ul>
    `;
  } else if (user.isFreelancer) {
    roleText = 'Freelancer';
    roleSteps = `
      <p><strong>As a Freelancer, you'll need to:</strong></p>
      <ul>
        <li>Add your job title and experience</li>
        <li>Upload your CV/Resume</li>
        <li>Add professional certificates</li>
        <li>Set your availability</li>
      </ul>
    `;
  } else if (user.isEquipmentOwner) {
    roleText = 'Equipment Owner';
    roleSteps = `
      <p><strong>As an Equipment Owner, you'll need to:</strong></p>
      <ul>
        <li>Add your equipment listings</li>
        <li>Upload equipment photos</li>
        <li>Set availability status</li>
        <li>Add contact details</li>
      </ul>
    `;
  }

  const subject = '✅ Role Selection Confirmed - Complete Your Profile';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .role-badge { background: #ddd6fe; color: #5b21b6; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Role Selection Confirmed! ✅</h1>
        </div>
        <div class="content">
          <h2>Great choice, ${user.firstName}!</h2>
          
          <p>Your role has been successfully set to:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span class="role-badge">${roleText}</span>
          </div>
          
          <p><strong>Next Step: Complete Your Profile</strong></p>
          
          ${roleSteps}
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Complete Your Profile</a>
          </div>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// 3. PROFILE COMPLETED (Freelancer)
// ==========================================
const sendProfileCompletedEmail = async (user) => {
  const subject = '🎊 Profile Complete - You\'re All Set!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #059669; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .checkmark { font-size: 48px; color: #10b981; text-align: center; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Your Profile is Complete! 🎊</h1>
        </div>
        <div class="content">
          <div class="checkmark">✓</div>
          
          <h2>Congratulations, ${user.firstName}!</h2>
          
          <p>Your professional profile has been successfully completed and is now live on ProFetch.</p>
          
          <p><strong>What you can do now:</strong></p>
          <ul>
            <li>Browse available opportunities</li>
            <li>Connect with potential clients</li>
            <li>Showcase your skills and experience</li>
            <li>Get discovered by recruiters</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Go to Dashboard</a>
          </div>
          
          <p><strong>Pro Tips:</strong></p>
          <ul>
            <li>Keep your profile updated</li>
            <li>Upload quality certificates</li>
            <li>Set accurate availability status</li>
            <li>Respond promptly to inquiries</li>
          </ul>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// 3B. EQUIPMENT ADDED (First Equipment)
// ==========================================
const sendEquipmentAddedEmail = async (user, equipmentName) => {
  const subject = '🎉 Equipment Added Successfully!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .equipment-box { background: white; padding: 20px; border-left: 4px solid #7c3aed; margin: 20px 0; border-radius: 5px; }
        .checkmark { font-size: 48px; color: #a855f7; text-align: center; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Equipment Added Successfully! 🎉</h1>
        </div>
        <div class="content">
          <div class="checkmark">✓</div>
          
          <h2>Great job, ${user.firstName}!</h2>
          
          <p>Your equipment has been successfully added and is now live on ProFetch.</p>
          
          <div class="equipment-box">
            <p><strong>Equipment Added:</strong> ${equipmentName}</p>
            <p style="color: #059669; font-weight: bold;">✓ Now visible to potential clients</p>
          </div>
          
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>Your equipment is now searchable on the platform</li>
            <li>Clients can view details and contact you</li>
            <li>You'll receive email notifications for inquiries</li>
            <li>You can manage availability from your dashboard</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Manage Your Equipment</a>
          </div>
          
          <p><strong>Pro Tips for Equipment Owners:</strong></p>
          <ul>
            <li>Upload clear, high-quality photos</li>
            <li>Keep availability status updated</li>
            <li>Add detailed descriptions</li>
            <li>Respond quickly to inquiries</li>
            <li>Update location and contact info regularly</li>
          </ul>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// 4. EQUIPMENT INQUIRY (to Equipment Owner)
// ==========================================
const sendEquipmentInquiryEmail = async (equipmentData, inquiryData) => {
  const subject = `📧 New Inquiry: ${equipmentData.name}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .inquiry-box { background: white; padding: 20px; border-left: 4px solid #7c3aed; margin: 20px 0; }
        .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">New Equipment Inquiry! 📧</h1>
        </div>
        <div class="content">
          <h2>Hi ${equipmentData.owner}!</h2>
          
          <p>You have received a new inquiry for your equipment:</p>
          
          <div class="inquiry-box">
            <p><strong>Equipment:</strong> ${equipmentData.name}</p>
            <p><strong>Location:</strong> ${equipmentData.location}</p>
            
            <hr>
            
            <p><strong>From:</strong> ${inquiryData.name}</p>
            <p><strong>Email:</strong> ${inquiryData.email}</p>
            ${inquiryData.phone ? `<p><strong>Phone:</strong> ${inquiryData.phone}</p>` : ''}
            
            <hr>
            
            <p><strong>Message:</strong></p>
            <p style="background: #f3f4f6; padding: 15px; border-radius: 5px;">${inquiryData.message}</p>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Reply to ${inquiryData.email} directly</li>
            ${inquiryData.phone ? `<li>Or call ${inquiryData.phone} for immediate response</li>` : ''}
          </ul>
          
          <div style="text-align: center;">
            <a href="mailto:${inquiryData.email}" class="button">Reply via Email</a>
            ${inquiryData.phone ? `<a href="tel:${inquiryData.phone}" class="button" style="background: #059669;">Call Now</a>` : ''}
          </div>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(equipmentData.ownerEmail, subject, html);
};

// ==========================================
// 5. INQUIRY CONFIRMATION (to Inquirer)
// ==========================================
const sendInquiryConfirmationEmail = async (equipmentData, inquiryData) => {
  const subject = '✅ Your Inquiry Has Been Sent';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Inquiry Sent Successfully! ✅</h1>
        </div>
        <div class="content">
          <h2>Hi ${inquiryData.name}!</h2>
          
          <p>Your inquiry for <strong>${equipmentData.name}</strong> has been successfully sent to the equipment owner.</p>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>The equipment owner will receive your inquiry</li>
            <li>They will contact you at ${inquiryData.email}</li>
            <li>You should expect a response within 24-48 hours</li>
          </ul>
          
          <p><strong>Your Inquiry Details:</strong></p>
          <ul>
            <li><strong>Equipment:</strong> ${equipmentData.name}</li>
            <li><strong>Owner:</strong> ${equipmentData.owner}</li>
            <li><strong>Location:</strong> ${equipmentData.location}</li>
          </ul>
          
          <p>If you don't hear back within 48 hours, please feel free to contact our support team.</p>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(inquiryData.email, subject, html);
};

// ==========================================
// 6. PROFILE UPDATE CONFIRMATION
// ==========================================
const sendProfileUpdateEmail = async (user) => {
  const subject = '✅ Profile Updated Successfully';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Profile Updated! ✅</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.firstName}!</h2>
          
          <p>Your profile has been successfully updated.</p>
          
          <p>Your changes are now live and visible to potential clients and recruiters on the platform.</p>
          
          <p><strong>Security Note:</strong> If you didn't make these changes, please contact us immediately at ${process.env.EMAIL_USER}</p>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// 7. PASSWORD RESET EMAIL
// ==========================================
const sendPasswordResetEmail = async (user, resetToken) => {
  const subject = '🔒 Password Reset Request - ProFetch';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .token-box { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .token { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 5px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔒 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.firstName}!</h2>
          
          <p>We received a request to reset your ProFetch account password.</p>
          
          <p><strong>Your 6-digit reset code is:</strong></p>
          
          <div class="token-box">
            <div class="token">${resetToken}</div>
          </div>
          
          <p><strong>This code will expire in 1 hour.</strong></p>
          
          <p>To reset your password:</p>
          <ol>
            <li>Enter this code on the password reset page</li>
            <li>Create your new password</li>
            <li>Confirm the change</li>
          </ol>
          
          <p><strong>Security Note:</strong> If you didn't request this password reset, please ignore this email or contact us immediately at ${process.env.EMAIL_USER}</p>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// 8. PASSWORD CHANGE CONFIRMATION
// ==========================================
const sendPasswordChangeConfirmation = async (user) => {
  const subject = '✅ Password Changed Successfully';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #059669; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Password Changed! ✅</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.firstName}!</h2>
          
          <p>Your ProFetch account password has been successfully changed.</p>
          
          <p>You can now login with your new password.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login to Your Account</a>
          </div>
          
          <p><strong>Security Alert:</strong> If you didn't make this change, please contact us immediately at ${process.env.EMAIL_USER}</p>
          
          <p>Best regards,<br><strong>The ProFetch Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

// ==========================================
// VERIFY EMAIL CONFIGURATION
// ==========================================
const verifyEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email credentials not configured in .env file');
      console.warn('   Required: EMAIL_USER and EMAIL_PASSWORD');
      return false;
    }
    
    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email verification failed:', error.message);
    console.warn('⚠️  Email features will be disabled');
    return false;
  }
};

// ==========================================
// 9. CONTACT EMAIL (to Candidate from Recruiter)
// ==========================================
const sendContactEmail = async (candidate, emailData) => {
  const subject = emailData.subject || 'New Message from Recruiter';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box { background: white; padding: 20px; border-left: 4px solid #0d9488; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; background: #0d9488; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">💼 New Message from Recruiter</h1>
        </div>
        <div class="content">
          <h2>Hi ${candidate.firstName}!</h2>
          
          <p>You have received a new message from a recruiter on TalentConnect.</p>
          
          <div class="message-box">
            <p><strong>From:</strong> ${emailData.senderInfo.name}</p>
            <p><strong>Subject:</strong> ${emailData.subject}</p>
            
            <hr>
            
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${emailData.message}</p>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review the message and opportunity details</li>
            <li>Log in to your dashboard to view and respond</li>
            <li>You can reply directly to ${emailData.senderInfo.email}</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">View in Dashboard</a>
          </div>
          
          <p><strong>Pro Tip:</strong> Responding quickly to recruiter messages increases your chances of landing opportunities!</p>
          
          <p>Best regards,<br><strong>The TalentConnect Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(candidate.email, subject, html);
};

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  sendWelcomeEmail,
  sendRoleSelectionEmail,
  sendProfileCompletedEmail,
  sendEquipmentInquiryEmail,
  sendInquiryConfirmationEmail,
  sendProfileUpdateEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
  verifyEmailConfig,
  sendEquipmentAddedEmail,
  sendContactEmail
};
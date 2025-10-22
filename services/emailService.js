// services/emailService.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service configuration error:', error);
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

// Base HTML template wrapper
const getEmailTemplate = (title, content, footerText = '') => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
        }
        .header { 
          background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%);
          color: white; 
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
        }
        .content { 
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .content h2 {
          color: #0d9488;
          margin-bottom: 20px;
          font-size: 22px;
        }
        .content p {
          margin-bottom: 16px;
          color: #4b5563;
          font-size: 15px;
        }
        .button { 
          display: inline-block; 
          padding: 14px 32px;
          background-color: #0d9488;
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          margin: 24px 0;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #0f766e;
        }
        .info-box {
          background-color: #f0fdfa;
          border-left: 4px solid #0d9488;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .contact-card {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .contact-card h3 {
          color: #0d9488;
          margin-bottom: 12px;
          font-size: 18px;
        }
        .contact-item {
          display: flex;
          align-items: center;
          margin: 8px 0;
          color: #4b5563;
        }
        .contact-item strong {
          min-width: 100px;
          color: #1f2937;
        }
        .footer { 
          text-align: center; 
          color: #6b7280;
          font-size: 13px;
          padding: 30px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 8px 0;
        }
        .footer a {
          color: #0d9488;
          text-decoration: none;
        }
        .logo {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }
        .divider {
          border-top: 1px solid #e5e7eb;
          margin: 24px 0;
        }
        @media only screen and (max-width: 600px) {
          .header, .content, .footer { padding: 24px 20px !important; }
          .header h1 { font-size: 24px !important; }
          .button { display: block; text-align: center; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔍 Find-Hire.Co</div>
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p><strong>Find-Hire.Co</strong> - The Industrial Hiring Hub</p>
          <p>Connecting talent with opportunities</p>
          ${footerText ? `<div class="divider"></div><p>${footerText}</p>` : ''}
          <p style="margin-top: 16px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Visit Website</a> • 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms">Terms</a> • 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy">Privacy</a>
          </p>
          <p style="margin-top: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Find-Hire.Co. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==========================================
// 1. WELCOME EMAIL (After Signup)
// ==========================================
const sendWelcomeEmail = async (userData) => {
  const { email, firstName, lastName, userType } = userData;
  
  const userTypeText = {
    'manpower': 'Freelancer',
    'equipment_owner': 'Equipment Owner',
    'both': 'Freelancer & Equipment Owner'
  };

  const content = `
    <h2>Welcome to Find-Hire.Co! 🎉</h2>
    <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
    <p>Thank you for joining <strong>Find-Hire.Co</strong> as a <strong>${userTypeText[userType]}</strong>! We're excited to have you as part of our community.</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>🎯 Your account type:</strong> ${userTypeText[userType]}</p>
    </div>

    <h3 style="color: #0d9488; margin-top: 28px; margin-bottom: 12px;">What's Next?</h3>
    ${userType === 'manpower' || userType === 'both' ? `
      <p><strong>📋 Complete Your Profile:</strong> Add your skills, experience, and upload your CV to stand out to employers.</p>
    ` : ''}
    ${userType === 'equipment_owner' || userType === 'both' ? `
      <p><strong>🏗️ List Your Equipment:</strong> Start adding your equipment to reach potential clients.</p>
    ` : ''}
    ${userType === 'manpower' ? `
      <p><strong>🔍 Browse Opportunities:</strong> Explore job listings and connect with employers looking for your skills.</p>
    ` : ''}
    ${userType === 'equipment_owner' ? `
      <p><strong>💼 Manage Listings:</strong> Keep your equipment availability updated to get more inquiries.</p>
    ` : ''}

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
        Go to Dashboard →
      </a>
    </div>

    <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
    <p>Best regards,<br><strong>The Find-Hire Team</strong></p>
  `;

  const mailOptions = {
    from: `"Find-Hire.Co" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to Find-Hire.Co!',
    html: getEmailTemplate('Welcome Aboard!', content, 'This is an automated message. Please do not reply to this email.')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// 2. PASSWORD RESET TOKEN EMAIL
// ==========================================
const sendPasswordResetEmail = async (userData, resetToken) => {
  const { email, firstName, lastName } = userData;
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?token=${resetToken}`;

  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
    <p>We received a request to reset your password for your Find-Hire.Co account.</p>
    
    <p>Click the button below to reset your password:</p>

    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">
        Reset Password
      </a>
    </div>

    <div class="warning-box">
      <p style="margin: 0;"><strong>⏰ Important:</strong> This link will expire in <strong>1 hour</strong>.</p>
    </div>

    <p>Or copy and paste this link into your browser:</p>
    <div class="info-box">
      <p style="margin: 0; word-break: break-all; font-size: 13px;">${resetUrl}</p>
    </div>

    <div class="divider"></div>

    <p><strong>🔒 Security Notice:</strong></p>
    <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account security.</p>
    
    <p>Your password will remain unchanged until you create a new one using the link above.</p>

    <p>Best regards,<br><strong>The Find-Hire Security Team</strong></p>
  `;

  const mailOptions = {
    from: `"Find-Hire.Co Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Password Reset Request - Find-Hire.Co',
    html: getEmailTemplate('Reset Your Password', content, 'This is an automated security message.')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// 3. PASSWORD CHANGE CONFIRMATION EMAIL
// ==========================================
const sendPasswordChangedEmail = async (userData) => {
  const { email, firstName, lastName } = userData;

  const content = `
    <h2>Password Changed Successfully ✅</h2>
    <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
    <p>This email confirms that your password has been successfully changed.</p>

    <div class="info-box">
      <p style="margin: 0;">
        <strong>🕐 Changed on:</strong> ${new Date().toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}
      </p>
    </div>

    <p>You can now log in to your account using your new password.</p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
        Log In to Your Account
      </a>
    </div>

    <div class="warning-box">
      <p style="margin: 0;"><strong>⚠️ Didn't make this change?</strong></p>
      <p style="margin: 8px 0 0 0;">If you didn't change your password, please contact our support team immediately to secure your account.</p>
    </div>

    <div class="divider"></div>

    <p><strong>🛡️ Security Tips:</strong></p>
    <ul style="color: #4b5563; margin: 12px 0; padding-left: 20px;">
      <li>Never share your password with anyone</li>
      <li>Use a unique password for Find-Hire.Co</li>
      <li>Enable two-factor authentication when available</li>
      <li>Log out from shared devices</li>
    </ul>

    <p>Best regards,<br><strong>The Find-Hire Security Team</strong></p>
  `;

  const mailOptions = {
    from: `"Find-Hire.Co Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Your Password Was Changed - Find-Hire.Co',
    html: getEmailTemplate('Password Changed', content, 'This is an automated security notification.')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password changed confirmation sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Password changed email error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// 4. INQUIRY EMAIL TO MANPOWER (Someone wants to contact)
// ==========================================
const sendManpowerInquiryEmail = async (manpowerData, inquirerData) => {
  const { email, firstName, lastName, jobTitle } = manpowerData;
  const { name, email: inquirerEmail, phone, message, subject } = inquirerData;

  const content = `
    <h2>New Inquiry About Your Profile! 💼</h2>
    <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
    <p>Good news! Someone is interested in your ${jobTitle} services on Find-Hire.Co.</p>

    <div class="contact-card">
      <h3>📧 Inquiry Details</h3>
      ${subject ? `<div class="contact-item"><strong>Subject:</strong> ${subject}</div>` : ''}
      <div class="contact-item"><strong>From:</strong> ${name}</div>
      <div class="contact-item"><strong>Email:</strong> <a href="mailto:${inquirerEmail}">${inquirerEmail}</a></div>
      ${phone ? `<div class="contact-item"><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></div>` : ''}
    </div>

    ${message ? `
      <div class="info-box">
        <p style="margin: 0;"><strong>📝 Message:</strong></p>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${message}</p>
      </div>
    ` : ''}

    <p><strong>What to do next:</strong></p>
    <ol style="color: #4b5563; margin: 12px 0; padding-left: 20px;">
      <li>Review the inquiry details above</li>
      <li>Respond promptly to show professionalism</li>
      <li>Use the contact information provided to get in touch</li>
    </ol>

    <div style="text-align: center;">
      <a href="mailto:${inquirerEmail}?subject=Re: ${encodeURIComponent(subject || 'Your inquiry on Find-Hire.Co')}" class="button">
        Reply via Email →
      </a>
    </div>

    <div class="divider"></div>

    <p><strong>💡 Quick Tip:</strong> Fast responses lead to better connections! Try to reply within 24 hours.</p>

    <p>Best regards,<br><strong>The Find-Hire Team</strong></p>
  `;

  const mailOptions = {
    from: `"Find-Hire.Co Opportunities" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🔔 New Inquiry: ${name} is interested in your ${jobTitle} services`,
    html: getEmailTemplate('New Opportunity!', content, 'You can reply directly to the inquirer using their email address above.'),
    replyTo: inquirerEmail
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Inquiry notification sent to manpower: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Manpower inquiry email error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// 5. INQUIRY EMAIL TO EQUIPMENT OWNER
// ==========================================
const sendEquipmentInquiryEmail = async (ownerData, equipmentData, inquirerData) => {
  const { email, name: ownerName, companyName } = ownerData;
  const { equipmentName, equipmentType } = equipmentData;
  const { name, email: inquirerEmail, phone, message, subject } = inquirerData;

  const content = `
    <h2>New Equipment Inquiry! 🏗️</h2>
    <p>Hi <strong>${ownerName}</strong>${companyName ? ` from <strong>${companyName}</strong>` : ''},</p>
    <p>Great news! Someone is interested in your equipment listing on Find-Hire.Co.</p>

    <div class="info-box">
      <p style="margin: 0;">
        <strong>🔧 Equipment:</strong> ${equipmentName}${equipmentType ? ` (${equipmentType})` : ''}
      </p>
    </div>

    <div class="contact-card">
      <h3>👤 Inquirer Information</h3>
      ${subject ? `<div class="contact-item"><strong>Subject:</strong> ${subject}</div>` : ''}
      <div class="contact-item"><strong>Name:</strong> ${name}</div>
      <div class="contact-item"><strong>Email:</strong> <a href="mailto:${inquirerEmail}">${inquirerEmail}</a></div>
      ${phone ? `<div class="contact-item"><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></div>` : ''}
    </div>

    ${message ? `
      <div class="info-box">
        <p style="margin: 0;"><strong>📝 Message from ${name}:</strong></p>
        <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${message}</p>
      </div>
    ` : ''}

    <p><strong>Next Steps:</strong></p>
    <ol style="color: #4b5563; margin: 12px 0; padding-left: 20px;">
      <li>Review the inquiry and check equipment availability</li>
      <li>Contact the inquirer to discuss rental terms</li>
      <li>Provide pricing and availability details</li>
      <li>Close the deal!</li>
    </ol>

    <div style="text-align: center;">
      <a href="mailto:${inquirerEmail}?subject=Re: ${encodeURIComponent(subject || `Inquiry about ${equipmentName}`)}" class="button">
        Reply via Email →
      </a>
    </div>

    <div class="divider"></div>

    <p><strong>💼 Pro Tip:</strong> Quick responses increase your chances of securing rentals. Try to reply within 24 hours for best results!</p>

    <p>Best regards,<br><strong>The Find-Hire Team</strong></p>
  `;

  const mailOptions = {
    from: `"Find-Hire.Co Rentals" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🔔 New Rental Inquiry: ${equipmentName} - ${name}`,
    html: getEmailTemplate('New Rental Inquiry!', content, 'You can reply directly to the inquirer using their email address above.'),
    replyTo: inquirerEmail
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Equipment inquiry notification sent to owner: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Equipment inquiry email error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// 6. INQUIRY CONFIRMATION TO SENDER
// ==========================================
const sendInquiryConfirmationEmail = async (inquirerData, targetData, type = 'manpower') => {
  const { email, name } = inquirerData;
  const { firstName, lastName, jobTitle, equipmentName, ownerName } = targetData;

  const targetName = type === 'manpower' 
    ? `${firstName} ${lastName}` 
    : ownerName || 'the equipment owner';
  
  const regarding = type === 'manpower'
    ? `${firstName} ${lastName}'s ${jobTitle} services`
    : `${equipmentName}`;

  const content = `
    <h2>Inquiry Sent Successfully! ✅</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for using Find-Hire.Co! Your inquiry has been successfully sent to <strong>${targetName}</strong>.</p>

    <div class="info-box">
      <p style="margin: 0;">
        <strong>📋 Regarding:</strong> ${regarding}
      </p>
    </div>

    <p><strong>What happens next?</strong></p>
    <ol style="color: #4b5563; margin: 12px 0; padding-left: 20px;">
      <li>${targetName} will receive your inquiry via email</li>
      <li>They will review your message and contact details</li>
      <li>You should hear back within 24-48 hours</li>
      <li>Check your email and phone for their response</li>
    </ol>

    <div class="warning-box">
      <p style="margin: 0;"><strong>⏰ Response Time:</strong> Most users respond within 24-48 hours. If you don't hear back, you can reach out again or explore other listings.</p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/${type === 'manpower' ? 'manpower-finder' : 'equipment'}" class="button">
        Browse More Listings →
      </a>
    </div>

    <p>Good luck with your ${type === 'manpower' ? 'hiring' : 'rental'} search!</p>

    <p>Best regards,<br><strong>The Find-Hire Team</strong></p>
  `;

  const mailOptions = {
    from: `"Find-Hire.Co" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `✅ Your inquiry was sent to ${targetName}`,
    html: getEmailTemplate('Inquiry Sent!', content, 'This is an automated confirmation.')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Inquiry confirmation sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Inquiry confirmation email error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================
module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendManpowerInquiryEmail,
  sendEquipmentInquiryEmail,
  sendInquiryConfirmationEmail,
  transporter 
};
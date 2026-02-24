const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to mobile number
exports.sendSmsOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });

    if(user){
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists. Try another number.'
      }); 
    }

    // Validate phone number
    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid 10-digit mobile number'
      });
    }

    // Check if there's an existing OTP and it's not expired yet
    const existingOTP = await OTP.findOne({ 
      phone,
      expiresAt: { $gt: new Date() }
    });

    if (existingOTP) {
      // If OTP exists and not expired, don't send new one immediately
      const timeLeft = Math.ceil((existingOTP.expiresAt - new Date()) / 1000);
      return res.status(400).json({
        success: false,
        message: `Please wait ${timeLeft} seconds before requesting new OTP`,
        data: { timeLeft }
      });
    }

    // Check if user exists with this phone
    const existingUser = await User.findOne({ phone });

    // Generate OTP
    const otp = generateOTP();
    
    // Set expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone
    await OTP.deleteMany({ phone });

    // Save OTP to database
    await OTP.create({
      phone,
      otp,
      expiresAt,
    });

    res.status(200).json({
        phone,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP'
    });
  }
};

// OTP
exports.verifySmsOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Validate inputs
    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid 10-digit mobile number'
      });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid 6-digit OTP'
      });
    }

    // Find OTP in database
    const otpRecord = await OTP.findOne({ 
      phone, 
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Delete used OTP
    await OTP.deleteMany({ phone });

    // Check if user exists
    let user = await User.findOne({ phone });

    // If user doesn't exist and it's checkout, create temporary user
    if (!user) {
        // Create a temporary user
        user = await User.create({
          phone,
          name: `${phone}`,
          email: `${phone}@gmail.com`, 
          password: crypto.randomBytes(8).toString('hex'), 
          role: 'user',
        });
    }

    // Generate JWT token
    const token = user.getJwtToken();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove sensitive data
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          landmark: user.landmark
        }
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify OTP'
    });
  }
};

// Resend OTP
exports.resendSmsOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid 10-digit mobile number'
      });
    }

    // Check if there's an existing OTP and it's not expired yet
    const existingOTP = await OTP.findOne({ 
      phone,
      expiresAt: { $gt: new Date() }
    });

    if (existingOTP) {
      // If OTP exists and not expired, don't send new one immediately
      const timeLeft = Math.ceil((existingOTP.expiresAt - new Date()) / 1000);
      return res.status(400).json({
        success: false,
        message: `Please wait ${timeLeft} seconds before requesting new OTP`,
        data: { timeLeft }
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save new OTP
    await OTP.create({
      phone,
      otp,
      expiresAt,
    });

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        phone,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        note: 'For testing, check server console for OTP'
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend OTP'
    });
  }
};
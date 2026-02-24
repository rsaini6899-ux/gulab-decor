const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const getFullImageUrl = require('../utils/getFullImageUrl');
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const { sendEmail } = require("../utils/emailService");
const axios = require('axios');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.uploadAuthImage = async (req, res, next) => {
  try {    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    
    const imageUrl = req.file.fullUrl;
    const folder = req.file.folder;
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,
        path: req.file.path,
        folder: folder,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
    
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
};

exports.registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'admin'
    });

    // Generate token
    const token = user.getJwtToken();

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, pincode, address, city, state, country } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      pincode,
      address,
      city,
      state,
      country,
      role: role || 'user'
    });

    // Generate token
    const token = user.getJwtToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        pincode: user.pincode,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
      }
    });
  } catch (error) {
    next(error);
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Authentication & Sign In
exports.googleAuth = async (req, res) => {
  try {
    const { token, code, redirectUri } = req.body;
    
    // ✅ Simple cache to prevent code reuse
    const cacheKey = `google_code_${code}`;
    if (global.googleCodeCache && global.googleCodeCache[cacheKey]) {
      return res.status(400).json({
        success: false,
        message: 'This authorization code has already been used',
        error: 'invalid_grant'
      });
    }
    
    // Initialize cache if not exists
    if (!global.googleCodeCache) {
      global.googleCodeCache = {};
    }
    
    // Mark code as used (expire in 10 minutes)
    global.googleCodeCache[cacheKey] = true;
    setTimeout(() => {
      delete global.googleCodeCache[cacheKey];
    }, 10 * 60 * 1000);

    let payload;
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    if (code) {
      
      try {
        const { tokens } = await client.getToken({
          code,
          redirect_uri: redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/google/callback`
        });
        
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        
        payload = ticket.getPayload();
        
      } catch (codeError) {
        console.error('Code exchange failed:', codeError.message);
        
        // Clear from cache on error
        delete global.googleCodeCache[cacheKey];
        
        // Check specific error
        if (codeError.message.includes('invalid_grant')) {
          return res.status(400).json({
            success: false,
            message: 'This authorization code is invalid or has expired',
            error: 'invalid_grant'
          });
        }
        throw codeError;
      }
    } 
    else if (token) {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Either token or code is required"
      });
    }

    const { email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(20).toString("hex"),
        avatar: {
          url: picture,
        },
        isActive: true,
        lastLogin: Date.now(),
      });
    } else {
      console.log('User exists, updating last login');
      user.lastLogin = Date.now();
      await user.save();
    }

    // Generate JWT token
    const jwtToken = user.getJwtToken()

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
    
  } catch (error) {
    console.error("Google auth error:", error.message);
    
    res.status(400).json({
      success: false,
      message: "Google authentication failed",
      error: error.message || 'authentication_failed',
    });
  }
};

// Send OTP to email
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update OTP for existing user
      user.resetPasswordToken = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
      user.resetPasswordExpire = otpExpire;
      await user.save();
    } else {
      // Create temporary user record
      user = await User.create({
        email,
        name: email.split("@")[0], // Default name from email
        password: crypto.randomBytes(20).toString("hex"), // Temporary password
        resetPasswordToken: crypto
          .createHash("sha256")
          .update(otp)
          .digest("hex"),
        resetPasswordExpire: otpExpire,
        isActive: false, // User not fully registered yet
      });
    }

    // Send OTP email
    await sendEmail({
      email: user.email,
      subject: "Your OTP for Login",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Login OTP</h2>
          <p>Hello,</p>
          <p>Use the OTP below to sign in to your account:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #4CAF50;">
                ${otp}
              </span>
            </div>
          </div>
          
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email: user.email,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpire");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP token exists and is not expired
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    if (
      user.resetPasswordToken !== hashedOTP ||
      user.resetPasswordExpire < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // ✅ यहाँ पासवर्ड चेक सही करें:
    // Temporary password identify करने का बेहतर तरीका
    const isTemporaryPassword = !user.password || user.password.length < 20;

    // Update user status
    user.isActive = true;
    user.lastLogin = Date.now();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // If it's a new user (temporary password), generate a new one
    if (isTemporaryPassword) {
      const tempPassword = crypto.randomBytes(20).toString("hex");
      user.password = tempPassword; // Mongoose pre-save hook इसको हैश करेगा
    }

    await user.save();

    // Generate JWT token
    const token = user.getJwtToken();

    // Send welcome email
    await sendEmail({
      email: user.email,
      subject: "Welcome to Our Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Our Platform, ${user.name}! 🎉</h2>
          <p>Thank you for verifying your email. Your account has been successfully activated.</p>
          <p>You can now access all features of our platform.</p>
          <br/>
          <p>Best regards,<br/>The Team</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Check password
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = user.getJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, address, city, state, pincode, landmark } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields - ये सभी fields userSchema mein होने चाहिए
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;
    if (landmark) user.landmark = landmark;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          landmark: user.landmark,
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isMatched = await user.comparePassword(currentPassword);
    if (!isMatched) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
        res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' });
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, isActive, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, isActive, role },
      { new: true, runValidators: true }
    );
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

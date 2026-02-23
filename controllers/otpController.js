// const crypto = require('crypto');
// const User = require('../models/User');
// const OTP = require('../models/OTP'); 
// const { sendSMS } = require('../utils/smsService'); 
// const jwt = require('jsonwebtoken');

// // Generate 6-digit OTP
// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Send OTP to mobile number
// exports.sendOTP = async (req, res) => {
//   try {
//     const { phone, isGuest } = req.body;

//     // Validate phone number
//     if (!phone || phone.length !== 10) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide valid 10-digit mobile number'
//       });
//     }

//     // Check if user exists with this phone
//     const existingUser = await User.findOne({ phone });

//     // Generate OTP
//     const otp = generateOTP();
    
//     // Set expiry (10 minutes)
//     const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

//     // Delete any existing OTP for this phone
//     await OTP.deleteMany({ phone });

//     // Save OTP to database
//     await OTP.create({
//       phone,
//       otp,
//       expiresAt,
//       purpose: isGuest ? 'guest_checkout' : 'login'
//     });

//     // In development, log OTP to console
//     console.log(`OTP for ${phone}: ${otp}`);

//     // For production: Send SMS
//     // await sendSMS(phone, `Your OTP is: ${otp}. Valid for 10 minutes.`);

//     // Don't send OTP in response in production
//     res.status(200).json({
//       success: true,
//       message: 'OTP sent successfully',
//       data: {
//         phone,
//         // Remove this in production:
//         otp: process.env.NODE_ENV === 'development' ? otp : undefined
//       }
//     });

//   } catch (error) {
//     console.error('Send OTP error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to send OTP'
//     });
//   }
// };

// // Verify OTP
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { phone, otp, isGuest } = req.body;

//     // Validate inputs
//     if (!phone || phone.length !== 10) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide valid 10-digit mobile number'
//       });
//     }

//     if (!otp || otp.length !== 6) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide valid 6-digit OTP'
//       });
//     }

//     // Find OTP in database
//     const otpRecord = await OTP.findOne({ 
//       phone, 
//       otp,
//       expiresAt: { $gt: new Date() }
//     });

//     if (!otpRecord) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid or expired OTP'
//       });
//     }

//     // Delete used OTP
//     await OTP.deleteMany({ phone });

//     // Check if user exists
//     let user = await User.findOne({ phone });

//     // If user doesn't exist and it's guest checkout, create temporary user
//     if (!user) {
//       if (isGuest) {
//         // Create a temporary guest user
//         user = await User.create({
//           phone,
//           name: `Guest_${phone}`,
//           email: `guest_${phone}@temp.com`, // Temporary email
//           password: crypto.randomBytes(8).toString('hex'), // Random password
//           role: 'guest',
//           isGuest: true
//         });
//       } else {
//         // If it's login and user doesn't exist, return error
//         return res.status(404).json({
//           success: false,
//           message: 'User not found. Please register first.'
//         });
//       }
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user._id, role: user.role, isGuest: user.isGuest || false },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save();

//     // Remove sensitive data
//     user.password = undefined;

//     res.status(200).json({
//       success: true,
//       message: 'OTP verified successfully',
//       data: {
//         token,
//         user: {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           phone: user.phone,
//           role: user.role,
//           isGuest: user.isGuest || false,
//           address: user.address,
//           city: user.city,
//           state: user.state,
//           pincode: user.pincode
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Verify OTP error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to verify OTP'
//     });
//   }
// };

// // Resend OTP
// exports.resendOTP = async (req, res) => {
//   try {
//     const { phone, isGuest } = req.body;

//     if (!phone || phone.length !== 10) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide valid 10-digit mobile number'
//       });
//     }

//     // Check if there's an existing OTP and it's not expired yet
//     const existingOTP = await OTP.findOne({ 
//       phone,
//       expiresAt: { $gt: new Date() }
//     });

//     if (existingOTP) {
//       // If OTP exists and not expired, don't send new one immediately
//       const timeLeft = Math.ceil((existingOTP.expiresAt - new Date()) / 1000);
//       return res.status(400).json({
//         success: false,
//         message: `Please wait ${timeLeft} seconds before requesting new OTP`,
//         data: { timeLeft }
//       });
//     }

//     // Generate new OTP
//     const otp = generateOTP();
//     const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

//     // Save new OTP
//     await OTP.create({
//       phone,
//       otp,
//       expiresAt,
//       purpose: isGuest ? 'guest_checkout' : 'login'
//     });

//     console.log(`Resent OTP for ${phone}: ${otp}`);

//     res.status(200).json({
//       success: true,
//       message: 'OTP resent successfully',
//       data: {
//         phone,
//         otp: process.env.NODE_ENV === 'development' ? otp : undefined
//       }
//     });

//   } catch (error) {
//     console.error('Resend OTP error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to resend OTP'
//     });
//   }
// };

// // Update user profile after checkout
// exports.updateUserProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { name, email, address, city, state, pincode, landmark } = req.body;

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Update fields
//     if (name) user.name = name;
//     if (email) user.email = email;
//     if (address) user.address = address;
//     if (city) user.city = city;
//     if (state) user.state = state;
//     if (pincode) user.pincode = pincode;
//     if (landmark) user.landmark = landmark;

//     // If user was guest, convert to regular user
//     if (user.isGuest) {
//       user.isGuest = false;
//       user.role = 'user';
//     }

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'Profile updated successfully',
//       data: {
//         user: {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           phone: user.phone,
//           address: user.address,
//           city: user.city,
//           state: user.state,
//           pincode: user.pincode,
//           landmark: user.landmark,
//           isGuest: user.isGuest
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Update profile error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to update profile'
//     });
//   }
// };


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
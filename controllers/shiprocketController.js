// const Shiprocket = require('../models/shiprocket');
// const axios = require('axios');

// // ✅ Save Shiprocket settings to DB
// exports.saveShiprocketSettings = async (req, res, next) => {
//   try {
//     const { email, password, apiToken, channelId, isLive, isEnabled, pickupLocation } = req.body;

//     // Validation
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email and password are required'
//       });
//     }

//     // Deactivate all previous settings (optional)
//     // await Shiprocket.updateMany({}, { isActive: false });

//     // Create new settings (automatically encrypts via pre-save hook)
//     const shiprocket = await Shiprocket.create({
//       email,
//       password,           // Will be encrypted
//       apiToken,            // Will be encrypted if provided
//       channelId,
//       isLive: isLive || false,
//       isEnabled: isEnabled !== undefined ? isEnabled : true,
//       pickupLocation: pickupLocation || {},
//       updatedBy: req.user.id
//     });

//     // Return response without sensitive data
//     res.status(201).json({
//       success: true,
//       message: 'Shiprocket settings saved successfully',
//       data: {
//         _id: shiprocket._id,
//         email: shiprocket.email,
//         isLive: shiprocket.isLive,
//         isEnabled: shiprocket.isEnabled,
//         pickupLocation: shiprocket.pickupLocation,
//         createdAt: shiprocket.createdAt,
//         updatedAt: shiprocket.updatedAt
//         // ❌ password and apiToken not sent
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error saving Shiprocket settings:', error);
//     next(error);
//   }
// };

// // ✅ Get active Shiprocket settings (for frontend - without secrets)
// exports.getShiprocketSettings = async (req, res, next) => {
//   try {
//     const shiprocket = await Shiprocket.findOne().sort({ createdAt: -1 });
    
//     if (!shiprocket) {
//       return res.status(200).json({
//         success: true,
//         data: null,
//         message: 'No Shiprocket settings found'
//       });
//     }

//     // Return without sensitive data
//     res.status(200).json({
//       success: true,
//       data: {
//         _id: shiprocket._id,
//         email: shiprocket.email,
//         isLive: shiprocket.isLive,
//         isEnabled: shiprocket.isEnabled,
//         pickupLocation: shiprocket.pickupLocation,
//         createdAt: shiprocket.createdAt,
//         updatedAt: shiprocket.updatedAt
//         // ❌ No password or apiToken sent
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error getting Shiprocket settings:', error);
//     next(error);
//   }
// };

// // ✅ Test Shiprocket connection (with encryption)
// exports.testShiprocketConnection = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     // Call Shiprocket API to test login
//     const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
//       email,
//       password
//     });

//     if (response.data && response.data.token) {
//       res.status(200).json({
//         success: true,
//         message: 'Connection successful',
//         token: response.data.token
//       });
//     } else {
//       throw new Error('Invalid response from Shiprocket');
//     }
//   } catch (error) {
//     console.error('❌ Shiprocket connection test failed:', error);
//     res.status(400).json({
//       success: false,
//       message: error.response?.data?.message || 'Connection failed'
//     });
//   }
// };

// // ✅ Get Shiprocket token for API calls (internal use)
// exports.getShiprocketToken = async () => {
//   try {
//     const shiprocket = await Shiprocket.findOne().sort({ createdAt: -1 });
    
//     if (!shiprocket || !shiprocket.isEnabled) {
//       throw new Error('Shiprocket not configured or disabled');
//     }

//     // Call Shiprocket API with credentials
//     const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
//       email: shiprocket.email,
//       password: shiprocket.password // This is encrypted in DB, need to compare
//     });

//     return response.data.token;
//   } catch (error) {
//     console.error('❌ Failed to get Shiprocket token:', error);
//     throw error;
//   }
// };



const Shiprocket = require('../models/shiprocket');
const axios = require('axios');

// ✅ Save OR Update Shiprocket settings
// ✅ Save OR Update Shiprocket settings (with auto token refresh)
exports.saveShiprocketSettings = async (req, res, next) => {
  try {
    const { email, password, apiToken, channelId, isLive, isEnabled, pickupLocation } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if settings exist
    let shiprocket = await Shiprocket.findOne().sort({ createdAt: -1 });

    if (shiprocket) {
      // UPDATE EXISTING
      console.log('📝 Updating existing Shiprocket settings...');
      
      const passwordChanged = shiprocket.email !== email || 
        !(await shiprocket.comparePassword(password).catch(() => false));
      
      shiprocket.email = email;
      
      if (passwordChanged) {
        // Password changed, so we need new token
        shiprocket.password = password;
        shiprocket.plainPassword = password; // Store for API calls
        shiprocket.apiToken = null; // Clear old token
        shiprocket.lastTokenRefresh = null;
        shiprocket.tokenExpiry = null;
        console.log('🔐 Password changed, token will be refreshed on next API call');
      }
      
      if (apiToken) shiprocket.apiToken = apiToken;
      if (channelId) shiprocket.channelId = channelId;
      if (isLive !== undefined) shiprocket.isLive = isLive;
      if (isEnabled !== undefined) shiprocket.isEnabled = isEnabled;
      if (pickupLocation) shiprocket.pickupLocation = pickupLocation;
      
      shiprocket.updatedBy = req.user.id;
      
      await shiprocket.save();
      
    } else {
      // CREATE NEW
      console.log('🆕 Creating new Shiprocket settings...');
      
      shiprocket = await Shiprocket.create({
        email,
        password,
        plainPassword: password, // Store for API calls
        apiToken,
        channelId,
        isLive: isLive || false,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        pickupLocation: pickupLocation || {},
        updatedBy: req.user.id
      });
    }

    // Try to get token immediately if not present
    if (!shiprocket.apiToken) {
      try {
        const axios = require('axios');
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
          email,
          password
        });
        
        if (response.data?.token) {
          shiprocket.apiToken = response.data.token;
          shiprocket.lastTokenRefresh = new Date();
          shiprocket.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
          await shiprocket.save();
          console.log('✅ Token obtained and saved');
        }
      } catch (tokenError) {
        console.log('⚠️ Could not get token immediately, will be fetched on first API call');
      }
    }

    // Return response without sensitive data
    res.status(201).json({
      success: true,
      message: shiprocket.isNew ? 'Settings created' : 'Settings updated',
      data: {
        _id: shiprocket._id,
        email: shiprocket.email,
        isLive: shiprocket.isLive,
        isEnabled: shiprocket.isEnabled,
        pickupLocation: shiprocket.pickupLocation,
        hasToken: !!shiprocket.apiToken,
        tokenExpiry: shiprocket.tokenExpiry,
        createdAt: shiprocket.createdAt,
        updatedAt: shiprocket.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error saving Shiprocket settings:', error);
    next(error);
  }
};
// ✅ Get active Shiprocket settings (for frontend - without secrets)
exports.getShiprocketSettings = async (req, res, next) => {
  try {
    const shiprocket = await Shiprocket.findOne().sort({ createdAt: -1 });
    
    if (!shiprocket) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No Shiprocket settings found'
      });
    }

    // Return without sensitive data
    res.status(200).json({
      success: true,
      data: {
        _id: shiprocket._id,
        email: shiprocket.email,
        isLive: shiprocket.isLive,
        isEnabled: shiprocket.isEnabled,
        pickupLocation: shiprocket.pickupLocation,
        createdAt: shiprocket.createdAt,
        updatedAt: shiprocket.updatedAt
        // ❌ No password or apiToken sent
      }
    });
  } catch (error) {
    console.error('❌ Error getting Shiprocket settings:', error);
    next(error);
  }
};


// ✅ Test Shiprocket connection
exports.testShiprocketConnection = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🧪 Testing Shiprocket connection for:', email);

    // Call Shiprocket API to test login
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email,
      password
    });

    if (response.data && response.data.token) {
      console.log('✅ Shiprocket connection successful');
      
      res.status(200).json({
        success: true,
        message: 'Connection successful',
        token: response.data.token
      });
    } else {
      throw new Error('Invalid response from Shiprocket');
    }
  } catch (error) {
    console.error('❌ Shiprocket connection test failed:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      message: error.response?.data?.message || 'Connection failed'
    });
  }
};

// ✅ INTERNAL FUNCTION: Get Shiprocket token for API calls
// Ye function service layer me use hoga
exports.getShiprocketTokenForService = async () => {
  try {
    // Get latest enabled settings
    const shiprocket = await Shiprocket.findOne({ isEnabled: true }).sort({ createdAt: -1 });
    
    if (!shiprocket) {
      throw new Error('Shiprocket not configured or disabled');
    }

    console.log('🔑 Getting Shiprocket token for:', shiprocket.email);

    // यहाँ हमें password decrypt करने की जरूरत है
    // लेकिन हमारे पास encrypted password है
    // इसलिए हमें एक अलग तरीका अपनाना होगा
    
    // OPTION 1: API token already stored hai to use karo
    if (shiprocket.apiToken) {
      console.log('📝 Using existing API token');
      return shiprocket.apiToken;
    }
    
    // OPTION 2: Admin ne password bheja hoga request me
    // Lekin ye internal function hai, isliye humein password nahi milega
    
    // OPTION 3: Shiprocket API se naya token le lo
    // Lekin iske liye plain password chahiye
    
    console.log('⚠️ Cannot get token without plain password');
    throw new Error('API token not available. Please update settings with valid credentials.');
    
  } catch (error) {
    console.error('❌ Failed to get Shiprocket token:', error);
    throw error;
  }
};
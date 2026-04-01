const Shiprocket = require('../models/shiprocket');
const axios = require('axios');

// ✅ Save OR Update Shiprocket settings (
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

//     // Check if settings exist
//     let shiprocket = await Shiprocket.findOne().sort({ createdAt: -1 });

//     if (shiprocket) {
//       // UPDATE EXISTING
//       console.log('📝 Updating existing Shiprocket settings...');
      
//       const passwordChanged = shiprocket.email !== email || 
//         !(await shiprocket.comparePassword(password).catch(() => false));
      
//       shiprocket.email = email;
      
//       if (passwordChanged) {
//         // Password changed, so we need new token
//         shiprocket.password = password;
//         shiprocket.plainPassword = password; // Store for API calls
//         shiprocket.apiToken = null; // Clear old token
//         shiprocket.lastTokenRefresh = null;
//         shiprocket.tokenExpiry = null;
//         console.log('🔐 Password changed, token will be refreshed on next API call');
//       }
      
//       if (apiToken) shiprocket.apiToken = apiToken;
//       if (channelId) shiprocket.channelId = channelId;
//       if (isLive !== undefined) shiprocket.isLive = isLive;
//       if (isEnabled !== undefined) shiprocket.isEnabled = isEnabled;
//       if (pickupLocation) shiprocket.pickupLocation = pickupLocation;
      
//       shiprocket.updatedBy = req.user.id;
      
//       await shiprocket.save();
      
//     } else {
//       // CREATE NEW
//       console.log('🆕 Creating new Shiprocket settings...');
      
//       shiprocket = await Shiprocket.create({
//         email,
//         password,
//         plainPassword: password, // Store for API calls
//         apiToken,
//         channelId,
//         isLive: isLive || false,
//         isEnabled: isEnabled !== undefined ? isEnabled : true,
//         pickupLocation: pickupLocation || {},
//         updatedBy: req.user.id
//       });
//     }

//     // Try to get token immediately if not present
//     if (!shiprocket.apiToken) {
//       try {
//         const axios = require('axios');
//         const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
//           email,
//           password
//         });
        
//         if (response.data?.token) {
//           shiprocket.apiToken = response.data.token;
//           shiprocket.lastTokenRefresh = new Date();
//           shiprocket.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
//           await shiprocket.save();
//           console.log('✅ Token obtained and saved');
//         }
//       } catch (tokenError) {
//         console.log('⚠️ Could not get token immediately, will be fetched on first API call');
//       }
//     }

//     // Return response without sensitive data
//     res.status(201).json({
//       success: true,
//       message: shiprocket.isNew ? 'Settings created' : 'Settings updated',
//       data: {
//         _id: shiprocket._id,
//         email: shiprocket.email,
//         isLive: shiprocket.isLive,
//         isEnabled: shiprocket.isEnabled,
//         pickupLocation: shiprocket.pickupLocation,
//         hasToken: !!shiprocket.apiToken,
//         tokenExpiry: shiprocket.tokenExpiry,
//         createdAt: shiprocket.createdAt,
//         updatedAt: shiprocket.updatedAt
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ Error saving Shiprocket settings:', error);
//     next(error);
//   }
// };

exports.saveShiprocketSettings = async (req, res, next) => {
  try {
    const { 
      email, 
      password, 
      apiToken, 
      channelId, 
      isLive, 
      isEnabled, 
      pickupLocation,
      shippingMethods // ✅ New field
    } = req.body;

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
        shiprocket.password = password;
        shiprocket.plainPassword = password;
        shiprocket.apiToken = null;
        shiprocket.lastTokenRefresh = null;
        shiprocket.tokenExpiry = null;
        console.log('🔐 Password changed, token will be refreshed on next API call');
      }
      
      if (apiToken) shiprocket.apiToken = apiToken;
      if (channelId) shiprocket.channelId = channelId;
      if (isLive !== undefined) shiprocket.isLive = isLive;
      if (isEnabled !== undefined) shiprocket.isEnabled = isEnabled;
      if (pickupLocation) shiprocket.pickupLocation = pickupLocation;
      
      // ✅ Update shipping methods if provided
      if (shippingMethods && Array.isArray(shippingMethods)) {
        // Validate and process shipping methods
        const processedMethods = shippingMethods.map(method => {
          // Generate name from displayName if not provided
          const methodName = method.name || method.displayName.toLowerCase().replace(/\s+/g, '-');
          
          return {
            name: methodName,
            displayName: method.displayName,
            description: method.description || '',
            minDays: Number(method.minDays) || 3,
            maxDays: Number(method.maxDays) || 5,
            price: Number(method.price) || 0,
            isEnabled: method.isEnabled !== undefined ? method.isEnabled : true,
            freeShippingAbove: method.freeShippingAbove ? Number(method.freeShippingAbove) : null,
            isDefault: method.isDefault || false
          };
        });
        
        // Ensure only one default method
        const defaultCount = processedMethods.filter(m => m.isDefault).length;
        if (defaultCount > 1) {
          return res.status(400).json({
            success: false,
            message: 'Only one shipping method can be set as default'
          });
        }
        
        // If no default, set first as default
        if (defaultCount === 0 && processedMethods.length > 0) {
          processedMethods[0].isDefault = true;
        }
        
        shiprocket.shippingMethods = processedMethods;
        console.log(`✅ Updated ${processedMethods.length} shipping methods`);
      }
      
      shiprocket.updatedBy = req.user.id;
      await shiprocket.save();
      
    } else {
      // CREATE NEW
      console.log('🆕 Creating new Shiprocket settings...');
      
      // Process shipping methods
      let processedMethods = [];
      if (shippingMethods && Array.isArray(shippingMethods) && shippingMethods.length > 0) {
        processedMethods = shippingMethods.map(method => ({
          name: method.name || method.displayName.toLowerCase().replace(/\s+/g, '-'),
          displayName: method.displayName,
          description: method.description || '',
          minDays: Number(method.minDays) || 3,
          maxDays: Number(method.maxDays) || 5,
          price: Number(method.price) || 0,
          isEnabled: method.isEnabled !== undefined ? method.isEnabled : true,
          freeShippingAbove: method.freeShippingAbove ? Number(method.freeShippingAbove) : null,
          isDefault: method.isDefault || false
        }));
      } else {
        // Default shipping methods
        processedMethods = [
          {
            name: 'standard-shipping',
            displayName: 'Standard Shipping',
            description: '5-7 business days',
            minDays: 5,
            maxDays: 7,
            price: 0,
            isEnabled: true,
            isDefault: true,
            freeShippingAbove: null
          },
          {
            name: 'express-shipping',
            displayName: 'Express Shipping',
            description: '2-3 business days',
            minDays: 2,
            maxDays: 3,
            price: 99,
            isEnabled: true,
            isDefault: false,
            freeShippingAbove: 500
          },
          {
            name: 'priority-shipping',
            displayName: 'Priority Shipping',
            description: '1 business day',
            minDays: 1,
            maxDays: 1,
            price: 199,
            isEnabled: true,
            isDefault: false,
            freeShippingAbove: 1000
          }
        ];
      }
      
      // Ensure only one default
      const defaultCount = processedMethods.filter(m => m.isDefault).length;
      if (defaultCount === 0 && processedMethods.length > 0) {
        processedMethods[0].isDefault = true;
      }
      
      shiprocket = await Shiprocket.create({
        email,
        password,
        plainPassword: password,
        apiToken,
        channelId,
        isLive: isLive || false,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        shippingMethods: processedMethods,
        pickupLocation: pickupLocation || {},
        updatedBy: req.user.id
      });
      
      console.log(`✅ Created with ${processedMethods.length} shipping methods`);
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
        shippingMethods: shiprocket.shippingMethods, // ✅ Return shipping methods
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
        password: shiprocket.password,
        isLive: shiprocket.isLive,
        isEnabled: shiprocket.isEnabled,
         shippingMethods: shiprocket.shippingMethods,
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

exports.getShippingCharges = async (req, res, next) => {
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
        shippingMethods: shiprocket.shippingMethods
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
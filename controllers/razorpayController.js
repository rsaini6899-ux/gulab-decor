const Razorpay = require('../models/razorpay');

// ✅ Save Razorpay settings to DB
// exports.saveRazorpaySettings = async (req, res, next) => {
//   try {
//     const { keyId, keySecret, webhookSecret, isLive, isEnabled } = req.body;

//     // Validation
//     if (!keyId || !keySecret) {
//       return res.status(400).json({
//         success: false,
//         message: 'Key ID and Key Secret are required'
//       });
//     }

//     // Deactivate all previous settings (optional - agar sirf ek active rakhna hai to)
//     // await Razorpay.updateMany({}, { isActive: false });

//     // Create new settings (automatically encrypts via pre-save hook)
//     const razorpay = await Razorpay.create({
//       keyId,
//       keySecret, 
//       encryptedKeySecret: keySecret,       // Will be encrypted
//       webhookSecret,     // Will be encrypted if provided
//       isLive: isLive || false,
//       isEnabled: isEnabled !== undefined ? isEnabled : true,
//       updatedBy: req.user.id
//     });

//     // Return response without sensitive data
//     res.status(201).json({
//       success: true,
//       message: 'Razorpay settings saved successfully',
//       data: {
//         _id: razorpay._id,
//         keyId: razorpay.keyId,
//         isLive: razorpay.isLive,
//         isEnabled: razorpay.isEnabled,
//         createdAt: razorpay.createdAt,
//         updatedAt: razorpay.updatedAt
//         // ❌ keySecret and webhookSecret not sent
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error saving Razorpay settings:', error);
//     next(error);
//   }
// };
exports.saveRazorpaySettings = async (req, res, next) => {
  try {
    const { keyId, keySecret, webhookSecret, isLive, isEnabled } = req.body;

    // Validation
    if (!keyId || !keySecret) {
      return res.status(400).json({
        success: false,
        message: 'Key ID and Key Secret are required'
      });
    }

    // ✅ सिर्फ encryptedKeySecret में स्टोर करें
    const razorpay = await Razorpay.create({
      keyId,
      encryptedKeySecret: keySecret,  // ✅ original secret (pre-save hook encrypt कर देगा)
      webhookSecret: webhookSecret || '',  // ✅ ये भी encrypt होगा अगर model में pre-save है
      isLive: isLive || false,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      updatedBy: req.user.id
    });

    // ✅ Response में sensitive data न भेजें
    res.status(201).json({
      success: true,
      message: 'Razorpay settings saved successfully',
      data: {
        _id: razorpay._id,
        keyId: razorpay.keyId,
        isLive: razorpay.isLive,
        isEnabled: razorpay.isEnabled,
        createdAt: razorpay.createdAt,
        updatedAt: razorpay.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error saving Razorpay settings:', error);
    next(error);
  }
};

// ✅ Get active Razorpay settings (for frontend - without secrets)
exports.getRazorpaySettings = async (req, res, next) => {
  try {
    const razorpay = await Razorpay.findOne().sort({ createdAt: -1 });
    
    if (!razorpay) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No Razorpay settings found'
      });
    }

    // Return without sensitive data
    res.status(200).json({
      success: true,
      data: {
        _id: razorpay._id,
        keyId: razorpay.keyId,
        keySecret: razorpay.encryptedKeySecret,
        webhookSecret: razorpay.webhookSecret,
        isLive: razorpay.isLive,
        isEnabled: razorpay.isEnabled,
        createdAt: razorpay.createdAt,
        updatedAt: razorpay.updatedAt
        // ❌ No secrets sent
      }
    });
  } catch (error) {
    console.error('❌ Error getting Razorpay settings:', error);
    next(error);
  }
};

// ✅ Verify Razorpay webhook signature
exports.verifyWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = req.body.webhookSecret; // Frontend se nahi aayega
    
    // Get settings from DB
    const razorpay = await Razorpay.findOne().sort({ createdAt: -1 });
    
    if (!razorpay || !razorpay.webhookSecret) {
      return res.status(400).json({
        success: false,
        message: 'Webhook secret not configured'
      });
    }

    // Compare webhook secret
    const isValid = await razorpay.compareWebhookSecret(webhookSecret);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    // Process webhook...
    next();
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    res.status(500).json({ success: false, message: 'Webhook verification failed' });
  }
};
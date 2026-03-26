const Basic = require('../models/basic');

// @access  Public
exports.getBasicInfo = async (req, res) => {
  try {
    const basic = await Basic.getSingleton();
    res.json({
      success: true,
      data: basic
    });
  } catch (error) {
    console.error('Error fetching basic info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching basic information',
      error: error.message
    });
  }
};

// @access  Private/Admin
// exports.updateBasicInfo = async (req, res) => {
//   try {
//     const basic = await Basic.getSingleton();
    
//     // Update fields
//     const updatableFields = [
//       'companyName', 'tagline', 'logo', 'description',
//       'address', 'phone', 'email', 'socialMedia',
//       'features', 'copyright', 'footerSettings', 'appVersion'
//     ];
    
//     updatableFields.forEach(field => {
//       if (req.body[field] !== undefined) {
//         basic[field] = req.body[field];
//       }
//     });
    
//     await basic.save();
    
//     res.json({
//       success: true,
//       message: 'Basic information updated successfully',
//       data: basic
//     });
//   } catch (error) {
//     console.error('Error updating basic info:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error updating basic information',
//       error: error.message
//     });
//   }
// };
// controllers/basicController.js - Update to handle primaryColor

exports.updateBasicInfo = async (req, res) => {
  try {
    const basic = await Basic.getSingleton();
    
    // Update fields including primaryColor
    const updatableFields = [
      'companyName', 'tagline', 'description', 'headerLogo', 'footerLogo',
      'address', 'phone', 'email', 'socialMedia', 'features', 
      'copyright', 'footerSettings', 'appVersion', 'primaryColor' // Add this
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        basic[field] = req.body[field];
      }
    });
    
    await basic.save();
    
    res.json({
      success: true,
      message: 'Basic information updated successfully',
      data: basic
    });
  } catch (error) {
    console.error('Error updating basic info:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating basic information',
      error: error.message
    });
  }
};

// @access  Private/Admin
exports.updateSocialMedia = async (req, res) => {
  try {
    const basic = await Basic.getSingleton();
    
    const { facebook, instagram, twitter, youtube } = req.body;
    
    if (facebook) basic.socialMedia.facebook = facebook;
    if (instagram) basic.socialMedia.instagram = instagram;
    if (twitter) basic.socialMedia.twitter = twitter;
    if (youtube) basic.socialMedia.youtube = youtube;
    
    await basic.save();
    
    res.json({
      success: true,
      message: 'Social media links updated successfully',
      data: basic.socialMedia
    });
  } catch (error) {
    console.error('Error updating social media:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating social media links',
      error: error.message
    });
  }
};

// @access  Private/Admin
exports.updateFeatures = async (req, res) => {
  try {
    const basic = await Basic.getSingleton();
    
    const { features } = req.body;
    
    if (Array.isArray(features)) {
      basic.features = features;
    }
    
    await basic.save();
    
    res.json({
      success: true,
      message: 'Features updated successfully',
      data: basic.features
    });
  } catch (error) {
    console.error('Error updating features:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating features',
      error: error.message
    });
  }
};

// PATCH /api/basic/footer-settings
exports.updateFooterSettings = async (req, res) => {
  try {
    const basic = await Basic.getSingleton();
    
    const { showPolicies, showContact, showSocial, showFeatures } = req.body;
    
    if (showPolicies !== undefined) basic.footerSettings.showPolicies = showPolicies;
    if (showContact !== undefined) basic.footerSettings.showContact = showContact;
    if (showSocial !== undefined) basic.footerSettings.showSocial = showSocial;
    if (showFeatures !== undefined) basic.footerSettings.showFeatures = showFeatures;
    
    await basic.save();
    
    res.json({
      success: true,
      message: 'Footer settings updated successfully',
      data: basic.footerSettings
    });
  } catch (error) {
    console.error('Error updating footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating footer settings',
      error: error.message
    });
  }
};


// POST /api/basic/upload-logo
exports.uploadLogos = async (req, res, next) => {
  try {
    const basic = await Basic.getSingleton();
    
    let uploadedFile = null;
    let fileType = req.body.type || 'header'; // Default to header
    
    // Check for specific fields first
    if (req.files) {
      if (req.files.headerLogo && req.files.headerLogo[0]) {
        uploadedFile = req.files.headerLogo[0];
        fileType = 'header';
      } else if (req.files.footerLogo && req.files.footerLogo[0]) {
        uploadedFile = req.files.footerLogo[0];
        fileType = 'footer';
      } else if (req.files.logo && req.files.logo[0]) {
        uploadedFile = req.files.logo[0];
        // Keep the type from body
      } else if (req.files.image && req.files.image[0]) {
        uploadedFile = req.files.image[0];
        // Keep the type from body
      }
    }
    
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }
    
    // Update the appropriate logo field based on fileType
    if (fileType === 'header') {
      basic.headerLogo = uploadedFile.fullUrl;
      basic.headerLogoPublicId = uploadedFile.public_id;
    } else if (fileType === 'footer') {
      basic.footerLogo = uploadedFile.fullUrl;
      basic.footerLogoPublicId = uploadedFile.public_id;
    } else {
      // If no type specified, try to determine from field name
      if (uploadedFile.fieldname === 'headerLogo') {
        basic.headerLogo = uploadedFile.fullUrl;
        basic.headerLogoPublicId = uploadedFile.public_id;
      } else if (uploadedFile.fieldname === 'footerLogo') {
        basic.footerLogo = uploadedFile.fullUrl;
        basic.footerLogoPublicId = uploadedFile.public_id;
      } else {
        // Default to header
        basic.headerLogo = uploadedFile.fullUrl;
        basic.headerLogoPublicId = uploadedFile.public_id;
      }
    }
    
    await basic.save();
    
    res.json({
      success: true,
      message: `${fileType} logo uploaded successfully`,
      data: {
        headerLogo: basic.headerLogo,
        footerLogo: basic.footerLogo
      }
    });
    
  } catch (error) {
    console.error('Logo upload error:', error);
    next(error);
  }
};

// ✅ Optional: Remove logo API bhi ek hi mein
exports.removeLogo = async (req, res, next) => {
  try {
    const { type } = req.params; // 'header' ya 'footer'
    
    if (!['header', 'footer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid logo type. Use "header" or "footer"'
      });
    }
    
    const basic = await Basic.getSingleton();
    
    // Remove specific logo
    if (type === 'header') {
      basic.headerLogo = '';
    } else {
      basic.footerLogo = '';
    }
    
    await basic.save();
    
    res.status(200).json({
      success: true,
      message: `${type} logo removed successfully`,
      data: {
        headerLogo: basic.headerLogo,
        footerLogo: basic.footerLogo
      }
    });
    
  } catch (error) {
    console.error('❌ Logo remove error:', error);
    next(error);
  }
};

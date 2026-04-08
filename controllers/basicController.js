// const Basic = require('../models/basic');

// // @access  Public
// exports.getBasicInfo = async (req, res) => {
//   try {
//     const basic = await Basic.getSingleton();
//     res.json({
//       success: true,
//       data: basic
//     });
//   } catch (error) {
//     console.error('Error fetching basic info:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching basic information',
//       error: error.message
//     });
//   }
// };

// //  Update to handle primaryColor
// exports.updateBasicInfo = async (req, res) => {
//   try {
//     const basic = await Basic.getSingleton();
    
//     // Update fields including primaryColor
//     const updatableFields = [
//       'companyName', 'tagline', 'description', 'headerLogo', 'footerLogo',
//       'address', 'phone', 'email', 'socialMedia', 'features', 
//       'copyright', 'footerSettings', 'appVersion', 'primaryColor' // Add this
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

// // @access  Private/Admin
// exports.updateSocialMedia = async (req, res) => {
//   try {
//     const basic = await Basic.getSingleton();
    
//     const { facebook, instagram, twitter, youtube } = req.body;
    
//     if (facebook) basic.socialMedia.facebook = facebook;
//     if (instagram) basic.socialMedia.instagram = instagram;
//     if (twitter) basic.socialMedia.twitter = twitter;
//     if (youtube) basic.socialMedia.youtube = youtube;
    
//     await basic.save();
    
//     res.json({
//       success: true,
//       message: 'Social media links updated successfully',
//       data: basic.socialMedia
//     });
//   } catch (error) {
//     console.error('Error updating social media:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error updating social media links',
//       error: error.message
//     });
//   }
// };

// // @access  Private/Admin
// exports.updateFeatures = async (req, res) => {
//   try {
//     const basic = await Basic.getSingleton();
    
//     const { features } = req.body;
    
//     if (Array.isArray(features)) {
//       basic.features = features;
//     }
    
//     await basic.save();
    
//     res.json({
//       success: true,
//       message: 'Features updated successfully',
//       data: basic.features
//     });
//   } catch (error) {
//     console.error('Error updating features:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error updating features',
//       error: error.message
//     });
//   }
// };

// // PATCH /api/basic/footer-settings
// exports.updateFooterSettings = async (req, res) => {
//   try {
//     const basic = await Basic.getSingleton();
    
//     const { showPolicies, showContact, showSocial, showFeatures } = req.body;
    
//     if (showPolicies !== undefined) basic.footerSettings.showPolicies = showPolicies;
//     if (showContact !== undefined) basic.footerSettings.showContact = showContact;
//     if (showSocial !== undefined) basic.footerSettings.showSocial = showSocial;
//     if (showFeatures !== undefined) basic.footerSettings.showFeatures = showFeatures;
    
//     await basic.save();
    
//     res.json({
//       success: true,
//       message: 'Footer settings updated successfully',
//       data: basic.footerSettings
//     });
//   } catch (error) {
//     console.error('Error updating footer settings:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error updating footer settings',
//       error: error.message
//     });
//   }
// };

// // POST /api/basic/upload-logo
// exports.uploadLogos = async (req, res, next) => {
//   try {
//     const basic = await Basic.getSingleton();
    
//     let uploadedFile = null;
//     let fileType = req.body.type || 'header'; // Default to header
    
//     // Check for specific fields first
//     if (req.files) {
//       if (req.files.headerLogo && req.files.headerLogo[0]) {
//         uploadedFile = req.files.headerLogo[0];
//         fileType = 'header';
//       } else if (req.files.footerLogo && req.files.footerLogo[0]) {
//         uploadedFile = req.files.footerLogo[0];
//         fileType = 'footer';
//       } else if (req.files.logo && req.files.logo[0]) {
//         uploadedFile = req.files.logo[0];
//         // Keep the type from body
//       } else if (req.files.image && req.files.image[0]) {
//         uploadedFile = req.files.image[0];
//         // Keep the type from body
//       }
//     }
    
//     if (!uploadedFile) {
//       return res.status(400).json({
//         success: false,
//         message: 'No logo file uploaded'
//       });
//     }
    
//     // Update the appropriate logo field based on fileType
//     if (fileType === 'header') {
//       basic.headerLogo = uploadedFile.fullUrl;
//       basic.headerLogoPublicId = uploadedFile.public_id;
//     } else if (fileType === 'footer') {
//       basic.footerLogo = uploadedFile.fullUrl;
//       basic.footerLogoPublicId = uploadedFile.public_id;
//     } else {
//       // If no type specified, try to determine from field name
//       if (uploadedFile.fieldname === 'headerLogo') {
//         basic.headerLogo = uploadedFile.fullUrl;
//         basic.headerLogoPublicId = uploadedFile.public_id;
//       } else if (uploadedFile.fieldname === 'footerLogo') {
//         basic.footerLogo = uploadedFile.fullUrl;
//         basic.footerLogoPublicId = uploadedFile.public_id;
//       } else {
//         // Default to header
//         basic.headerLogo = uploadedFile.fullUrl;
//         basic.headerLogoPublicId = uploadedFile.public_id;
//       }
//     }
    
//     await basic.save();
    
//     res.json({
//       success: true,
//       message: `${fileType} logo uploaded successfully`,
//       data: {
//         headerLogo: basic.headerLogo,
//         footerLogo: basic.footerLogo
//       }
//     });
    
//   } catch (error) {
//     console.error('Logo upload error:', error);
//     next(error);
//   }
// };

// // ✅ Optional: Remove logo API bhi ek hi mein
// exports.removeLogo = async (req, res, next) => {
//   try {
//     const { type } = req.params; // 'header' ya 'footer'
    
//     if (!['header', 'footer'].includes(type)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid logo type. Use "header" or "footer"'
//       });
//     }
    
//     const basic = await Basic.getSingleton();
    
//     // Remove specific logo
//     if (type === 'header') {
//       basic.headerLogo = '';
//     } else {
//       basic.footerLogo = '';
//     }
    
//     await basic.save();
    
//     res.status(200).json({
//       success: true,
//       message: `${type} logo removed successfully`,
//       data: {
//         headerLogo: basic.headerLogo,
//         footerLogo: basic.footerLogo
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ Logo remove error:', error);
//     next(error);
//   }
// };


// controllers/basicController.js - Complete updated controller

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
exports.updateBasicInfo = async (req, res) => {
  try {
    const basic = await Basic.getSingleton();
    
    // Update all fields including nested ones
    const updatableFields = [
      'companyName', 'tagline', 'description', 'headerLogo', 'footerLogo',
      'address', 'copyright', 'footerSettings', 'appVersion', 'primaryColor',
      'mapEmbedUrl'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        basic[field] = req.body[field];
      }
    });
    
    // Update phone numbers (nested)
    if (req.body.phoneNumbers) {
      if (req.body.phoneNumbers.customerSupport) {
        basic.phoneNumbers.customerSupport = {
          ...basic.phoneNumbers.customerSupport,
          ...req.body.phoneNumbers.customerSupport
        };
      }
      if (req.body.phoneNumbers.whatsapp) {
        basic.phoneNumbers.whatsapp = {
          ...basic.phoneNumbers.whatsapp,
          ...req.body.phoneNumbers.whatsapp
        };
      }
      if (req.body.phoneNumbers.storeEnquiries) {
        basic.phoneNumbers.storeEnquiries = {
          ...basic.phoneNumbers.storeEnquiries,
          ...req.body.phoneNumbers.storeEnquiries
        };
      }
    }
    
    // Update emails (nested)
    if (req.body.emails) {
      if (req.body.emails.customerSupport) {
        basic.emails.customerSupport = {
          ...basic.emails.customerSupport,
          ...req.body.emails.customerSupport
        };
      }
      if (req.body.emails.sales) {
        basic.emails.sales = {
          ...basic.emails.sales,
          ...req.body.emails.sales
        };
      }
      if (req.body.emails.collaborations) {
        basic.emails.collaborations = {
          ...basic.emails.collaborations,
          ...req.body.emails.collaborations
        };
      }
    }
    
    // Update business hours
    if (req.body.businessHours) {
      if (req.body.businessHours.weekdays) {
        basic.businessHours.weekdays = {
          ...basic.businessHours.weekdays,
          ...req.body.businessHours.weekdays
        };
      }
      if (req.body.businessHours.saturday) {
        basic.businessHours.saturday = {
          ...basic.businessHours.saturday,
          ...req.body.businessHours.saturday
        };
      }
      if (req.body.businessHours.sunday) {
        basic.businessHours.sunday = {
          ...basic.businessHours.sunday,
          ...req.body.businessHours.sunday
        };
      }
      if (req.body.businessHours.pickupNote !== undefined) {
        basic.businessHours.pickupNote = req.body.businessHours.pickupNote;
      }
    }
    
    // Update social media
    if (req.body.socialMedia) {
      basic.socialMedia = {
        ...basic.socialMedia,
        ...req.body.socialMedia
      };
    }
    
    // Update features
    if (req.body.features && Array.isArray(req.body.features)) {
      basic.features = req.body.features;
    }
    
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

// @access  Private/Admin
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

// @access  Private/Admin
exports.uploadLogos = async (req, res, next) => {
  try {
    const basic = await Basic.getSingleton();
    
    let uploadedFile = null;
    let fileType = req.body.type || 'header';
    
    if (req.files) {
      if (req.files.headerLogo && req.files.headerLogo[0]) {
        uploadedFile = req.files.headerLogo[0];
        fileType = 'header';
      } else if (req.files.footerLogo && req.files.footerLogo[0]) {
        uploadedFile = req.files.footerLogo[0];
        fileType = 'footer';
      } else if (req.files.logo && req.files.logo[0]) {
        uploadedFile = req.files.logo[0];
      } else if (req.files.image && req.files.image[0]) {
        uploadedFile = req.files.image[0];
      }
    }
    
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }
    
    if (fileType === 'header') {
      basic.headerLogo = uploadedFile.fullUrl;
      basic.headerLogoPublicId = uploadedFile.public_id;
    } else if (fileType === 'footer') {
      basic.footerLogo = uploadedFile.fullUrl;
      basic.footerLogoPublicId = uploadedFile.public_id;
    } else {
      if (uploadedFile.fieldname === 'headerLogo') {
        basic.headerLogo = uploadedFile.fullUrl;
        basic.headerLogoPublicId = uploadedFile.public_id;
      } else if (uploadedFile.fieldname === 'footerLogo') {
        basic.footerLogo = uploadedFile.fullUrl;
        basic.footerLogoPublicId = uploadedFile.public_id;
      } else {
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

// @access  Private/Admin
exports.removeLogo = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    if (!['header', 'footer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid logo type. Use "header" or "footer"'
      });
    }
    
    const basic = await Basic.getSingleton();
    
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
    console.error('Logo remove error:', error);
    next(error);
  }
};
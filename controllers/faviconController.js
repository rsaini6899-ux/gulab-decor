const Favicon = require('../models/favicon');
const cloudinary = require('../utils/cloudinary');

// Upload favicon
exports.uploadFavicon = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an icon file'
      });
    }

    // ✅ Purana favicon deactivate karo
    await Favicon.updateMany({}, { isActive: false });

    // ✅ Naya favicon save karo
    const favicon = await Favicon.create({
      icon: {
        url: req.file.fullUrl,
        public_id: req.file.filename
      },
      isActive: true,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: favicon
    });
  } catch (error) {
    console.error('❌ Error uploading favicon:', error);
    next(error);
  }
};

// Get active favicon
exports.getActiveFavicon = async (req, res, next) => {
  try {
    const favicon = await Favicon.findOne({ isActive: true });
    
    res.status(200).json({
      success: true,
      data: favicon || { icon: { url: '/default-favicon.ico' } }
    });
  } catch (error) {
    console.error('❌ Error getting favicon:', error);
    next(error);
  }
};

// Delete favicon
exports.deleteFavicon = async (req, res, next) => {
  try {
    const favicon = await Favicon.findById(req.params.id);
    
    if (!favicon) {
      return res.status(404).json({
        success: false,
        message: 'Favicon not found'
      });
    }

    // ✅ Cloudinary se bhi delete karo
    if (favicon.icon?.public_id) {
      await cloudinary.uploader.destroy(favicon.icon.public_id);
    }

    await favicon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Favicon deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting favicon:', error);
    next(error);
  }
};
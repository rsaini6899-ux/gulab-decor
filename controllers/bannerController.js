const Banner = require('../models/banner');
const getFullImageUrl = require('../utils/getFullImageUrl');

// Get all banners
exports.getAllBanners = async (req, res, next) => {
  try {
    const {
      status,
      deviceType,
      isFeatured,
      limit = 10,
      page = 1,
      sort = 'position',
      order = 'asc'
    } = req.query;

    // Build query
    let query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by device type
    if (deviceType && deviceType !== 'all') {
      query.deviceType = deviceType;
    }
    
    // Filter by featured
    if (isFeatured) {
      query.isFeatured = isFeatured === 'true';
    }
    
    // Filter by active status (for frontend)
    if (req.query.active === 'true') {
      const now = new Date();
      query.status = 'active';
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const banners = await Banner.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Banner.countDocuments(query);

    res.status(200).json({
      success: true,
      count: banners.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: banners
    });
  } catch (error) {
    next(error);
  }
};

// Get active banners for frontend
exports.getActiveBanners = async (req, res, next) => {
  try {
    const { device = 'desktop' } = req.query;
    const now = new Date();

    const banners = await Banner.find({ status: 'active' })
      .sort({ position: 1, createdAt: -1 })
      .select('-status -createdBy -updatedBy -__v')
      .lean();

    const transformedBanners = banners.map(banner => ({
      id: banner._id,
      image: device === 'mobile' ? banner.mobileImage.url : banner.desktopImage.url,
      desktopImage: banner.desktopImage.url,
      mobileImage: banner.mobileImage.url,
      title: banner.title,
      subtitle: banner.subtitle,
      cta: banner.ctaText,
      ctaLink: banner.ctaLink,
      targetUrl: banner.targetUrl
    }));

    res.status(200).json(transformedBanners);
  } catch (error) {
    next(error);
  }
};

// Get single banner
exports.getBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.status(200).json({
      success: true,
      data: banner
    });
  } catch (error) {
    next(error);
  }
};

// Create new banner
// exports.createBanner = async (req, res, next) => {
//   try {
//     // Validate required fields
//     const { title } = req.body;
//     if (!title) {
//       return res.status(400).json({
//         success: false,
//         message: 'Banner title is required'
//       });
//     }

//     // Handle images upload
//     let desktopImageData = {};
//     let mobileImageData = {};

//     // Desktop image handle
//     if (req.files && req.files.desktopImage) {
//       const imageFile = req.files.desktopImage[0];
//       desktopImageData = {
//         url: imageFile.fullUrl,
//         public_id: imageFile.filename,
//         folder: imageFile.folder || 'banners/desktop'
//       };
//     } else if (req.body.desktopImage) {
//       if (typeof req.body.desktopImage === 'string') {
//         desktopImageData = {
//           url: req.body.desktopImage,
//           public_id: `desktop-${Date.now()}`,
//           folder: 'external/desktop'
//         };
//       } else if (typeof req.body.desktopImage === 'object') {
//         desktopImageData = req.body.desktopImage;
//       }
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'Desktop banner image is required'
//       });
//     }

//     // Mobile image handle
//     if (req.files && req.files.mobileImage) {
//       const imageFile = req.files.mobileImage[0];
//       mobileImageData = {
//         url: imageFile.fullUrl,
//         public_id: imageFile.filename,
//         folder: imageFile.folder || 'banners/mobile'
//       };
//     } else if (req.body.mobileImage) {
//       if (typeof req.body.mobileImage === 'string') {
//         mobileImageData = {
//           url: req.body.mobileImage,
//           public_id: `mobile-${Date.now()}`,
//           folder: 'external/mobile'
//         };
//       } else if (typeof req.body.mobileImage === 'object') {
//         mobileImageData = req.body.mobileImage;
//       }
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'Mobile banner image is required'
//       });
//     }

//     // Prepare banner data
//     const bannerData = {
//       title,
//       subtitle: req.body.subtitle || '',
//       desktopImage: desktopImageData,
//       mobileImage: mobileImageData,
//       ctaText: req.body.ctaText || 'Shop Now',
//       ctaLink: req.body.ctaLink || '/products',
//       status: req.body.status || 'active',
//       position: parseInt(req.body.position) || 0,
//       targetUrl: req.body.targetUrl || '',
//       isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
//       createdBy: req.user.id
//     };

//     // Create banner
//     const banner = await Banner.create(bannerData);

//     res.status(201).json({
//       success: true,
//       message: 'Banner created successfully',
//       data: banner
//     });
//   } catch (error) {
//     console.error('❌ Error creating banner:', error);
    
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(val => val.message);
//       return res.status(400).json({
//         success: false,
//         message: messages.join(', ')
//       });
//     }
    
//     next(error);
//   }
// };
exports.createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, ctaText, status, position, isFeatured, ctaLink } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Handle images - req.files mein desktopImage aur mobileImage honge
    let desktopImageData = {};
    let mobileImageData = {};

    // Desktop image
    if (req.files && req.files.desktopImage) {
      const imageFile = req.files.desktopImage[0];
      desktopImageData = {
        url: imageFile.fullUrl,  // ✅ CLOUDINARY URL
        public_id: imageFile.filename,  // Cloudinary public_id
        folder: imageFile.folder || 'banners/desktop'
      };
    }

    // Mobile image
    if (req.files && req.files.mobileImage) {
      const imageFile = req.files.mobileImage[0];
      mobileImageData = {
        url: imageFile.fullUrl,  // ✅ CLOUDINARY URL
        public_id: imageFile.filename,  // Cloudinary public_id
        folder: imageFile.folder || 'banners/mobile'
      };
    }

    // Ensure at least one image is provided
    if (!desktopImageData.url && !mobileImageData.url) {
      return res.status(400).json({
        success: false,
        message: 'At least one image (desktop or mobile) is required'
      });
    }

    // Create banner
    const banner = await Banner.create({
      title,
      subtitle: subtitle || '',
      desktopImage: desktopImageData,
      mobileImage: mobileImageData,
      ctaText: ctaText || 'Shop Now',
      ctaLink: ctaLink || '/products',
      status: status || 'active',
      position: position || 0,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    console.error('❌ Error creating banner:', error);
    next(error);
  }
};


// Update banner
// exports.updateBanner = async (req, res, next) => {
//   try {
//     let banner = await Banner.findById(req.params.id);

//     if (!banner) {
//       return res.status(404).json({
//         success: false,
//         message: 'Banner not found'
//       });
//     }

//     // Handle images update
//     if (req.files && req.files.desktopImage) {
//       const imageFile = req.files.desktopImage[0];
//       req.body.desktopImage = {
//         url: imageFile.fullUrl,
//         public_id: imageFile.filename,
//         folder: imageFile.folder || 'banners/desktop'
//       };
//     }

//     if (req.files && req.files.mobileImage) {
//       const imageFile = req.files.mobileImage[0];
//       req.body.mobileImage = {
//         url: imageFile.fullUrl,
//         public_id: imageFile.filename,
//         folder: imageFile.folder || 'banners/mobile'
//       };
//     }

//     // Prepare update data
//     const updateData = { ...req.body };
    
//     // Handle boolean fields
//     if (req.body.isFeatured !== undefined) {
//       updateData.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;
//     }
    
//     // Handle numeric fields
//     if (req.body.position !== undefined) {
//       updateData.position = parseInt(req.body.position);
//     }

//     // Add updatedBy
//     updateData.updatedBy = req.user.id;

//     // Remove empty fields
//     Object.keys(updateData).forEach(key => {
//       if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
//         delete updateData[key];
//       }
//     });

//     // Update banner
//     banner = await Banner.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       {
//         new: true,
//         runValidators: true
//       }
//     ).populate('createdBy', 'name email')
//      .populate('updatedBy', 'name email');

//     res.status(200).json({
//       success: true,
//       message: 'Banner updated successfully',
//       data: banner
//     });
//   } catch (error) {
//     console.error('❌ Error updating banner:', error);
//     next(error);
//   }
// };
exports.updateBanner = async (req, res, next) => {
  try {
    let banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Handle desktop image update
    if (req.files && req.files.desktopImage) {
      const imageFile = req.files.desktopImage[0];
      
      // Purani image ko Cloudinary se delete karna optional hai
      // if (banner.desktopImage?.public_id) {
      //   try {
      //     await cloudinary.uploader.destroy(banner.desktopImage.public_id);
      //   } catch (err) {
      //     console.log('Old desktop image delete error:', err);
      //   }
      // }
      
      req.body.desktopImage = {
        url: imageFile.fullUrl,  // ✅ CLOUDINARY URL
        public_id: imageFile.filename,  // Cloudinary public_id
        folder: imageFile.folder || 'banners/desktop'
      };
    }

    // Handle mobile image update
    if (req.files && req.files.mobileImage) {
      const imageFile = req.files.mobileImage[0];
      
      // Purani image ko Cloudinary se delete karna optional hai
      // if (banner.mobileImage?.public_id) {
      //   try {
      //     await cloudinary.uploader.destroy(banner.mobileImage.public_id);
      //   } catch (err) {
      //     console.log('Old mobile image delete error:', err);
      //   }
      // }
      
      req.body.mobileImage = {
        url: imageFile.fullUrl,  // ✅ CLOUDINARY URL
        public_id: imageFile.filename,  // Cloudinary public_id
        folder: imageFile.folder || 'banners/mobile'
      };
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Handle boolean fields
    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;
    }
    
    // Handle numeric fields
    if (req.body.position !== undefined) {
      updateData.position = parseInt(req.body.position);
    }

    // Add updatedBy
    updateData.updatedBy = req.user.id;

    // Remove empty fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update banner
    banner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    console.error('❌ Error updating banner:', error);
    next(error);
  }
};


// Delete banner
exports.deleteBanner = async (req, res, next) => {
  try {

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // TODO: Delete image from cloud storage if needed
    // You might want to implement this based on your storage service

    await banner.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('❌ Error deleting banner:', error);
    next(error);
  }
};

// Upload banner image
// exports.uploadBannerImage = async (req, res, next) => {
//   try {
//     if (!req.files || !req.files.image) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please upload an image file'
//       });   
//     }

//     const imageFile = req.files.image[0];
    
//     // ✅ URL abhi generate karo with proper request object
//     const imageUrl = getFullImageUrl(req, imageFile.path || imageFile.filename);
    
//     console.log('Generated URL:', imageUrl); // Debug ke liye

//     res.status(200).json({
//       success: true,
//       message: 'Image uploaded successfully',
//       data: {
//         image: {
//           url: imageUrl,  // ✅ YAHAN GENERATED URL USE KARO
//           public_id: imageFile.filename,
//           folder: imageFile.folder,
//           size: imageFile.size,
//           mimetype: imageFile.mimetype
//         }
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error uploading image:', error);
//     next(error);
//   }
// };
exports.uploadBannerImage = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });   
    }

    const imageFile = req.files.image[0];
    
    // ✅ CLOUDINARY URL DIRECTLY USE KARO (processImage middleware ne fullUrl add kar diya hai)
    const imageUrl = imageFile.fullUrl;  // Cloudinary se already full URL
    
    console.log('Cloudinary URL:', imageUrl); // Debug ke liye

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        image: {
          url: imageUrl,  // ✅ CLOUDINARY URL
          public_id: imageFile.filename,  // Cloudinary public_id
          folder: imageFile.folder || 'banners',  // Cloudinary folder
          size: imageFile.size,
          mimetype: imageFile.mimetype
        }
      }
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    next(error);
  }
};
// Reorder banners
exports.reorderBanners = async (req, res, next) => {
  try {
    const { order } = req.body;

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'Order array is required'
      });
    }

    const bulkOps = order.map((bannerId, index) => ({
      updateOne: {
        filter: { _id: bannerId },
        update: { position: index }
      }
    }));

    await Banner.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Toggle banner status
exports.toggleBannerStatus = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    banner.status = banner.status === 'active' ? 'inactive' : 'active';
    banner.updatedBy = req.user.id;

    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner ${banner.status === 'active' ? 'activated' : 'deactivated'}`,
      data: banner
    });
  } catch (error) {
    next(error);
  }
};
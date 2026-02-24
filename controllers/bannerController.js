const Banner = require('../models/banner');

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

    const query = {
      status: 'active',
      $or: [
        { deviceType: 'all' },
        { deviceType: device }
      ],
    };

    const banners = await Banner.find(query)
      .sort({ position: 1, createdAt: -1 })
      .select('-status -createdBy -updatedBy -__v')
      .lean();

    // Transform data for frontend
    const transformedBanners = banners.map(banner => ({
      id: banner._id,
      image: banner.image.url,
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
exports.createBanner = async (req, res, next) => {
  try {
    // Validate required fields
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Banner title is required'
      });
    }

    // Handle image upload
    let imageData = {};
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      imageData = {
        url: imageFile.fullUrl,
        public_id: imageFile.filename,
        folder: imageFile.folder
      };
    } else if (req.body.image) {
      // If image URL provided directly (for external images)
      if (typeof req.body.image === 'string') {
        imageData = {
          url: req.body.image,
          public_id: `external-${Date.now()}`,
          folder: 'external'
        };
      } else if (typeof req.body.image === 'object') {
        imageData = req.body.image;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required'
      });
    }

    // Prepare banner data
    const bannerData = {
      title,
      subtitle: req.body.subtitle || '',
      image: imageData,
      ctaText: req.body.ctaText || 'Shop Now',
      ctaLink: req.body.ctaLink || '/products',
      status: req.body.status || 'active',
      position: parseInt(req.body.position) || 0,
      targetUrl: req.body.targetUrl || '',
      deviceType: req.body.deviceType || 'all',
      isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
      createdBy: req.user.id
    };

    // Create banner
    const banner = await Banner.create(bannerData);

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    console.error('❌ Error creating banner:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    next(error);
  }
};

// Update banner
exports.updateBanner = async (req, res, next) => {
  try {

    let banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Handle image update
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      req.body.image = {
        url: imageFile.fullUrl,
        public_id: imageFile.filename,
        folder: imageFile.folder
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
exports.uploadBannerImage = async (req, res, next) => {
  try {

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });   
    }

    const imageFile = req.files.image[0];

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        image: {
          url: imageFile.fullUrl,
          public_id: imageFile.filename,
          folder: imageFile.folder,
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
const Coupon = require('../models/coupon');

// Create new coupon
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      userLimit,
      showFrontend,
      isActive,
      color
    } = req.body;

    console.log('Received data:', req.body);
    
    // Validate title length
    if (title && title.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters'
      });
    }
    
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }
    
    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    // Validate discount value
    if (discountType === 'percentage' && (parseFloat(discountValue) < 0 || parseFloat(discountValue) > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 0 and 100'
      });
    }
    
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      title: title.trim(),
      description: description ? description.trim() : '',
      discountType,
      discountValue: parseFloat(discountValue),
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userLimit: parseInt(userLimit),
      showFrontend,
      isActive,
      color,
      createdBy: req.user?._id || null
    });
    
    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
    
  } catch (error) {
    console.error('Error in createCoupon:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error creating coupon',
      error: error.message
    });
  }
}

// Get all coupons with filtering, pagination, and stats
exports.getAllCoupons = async (req, res, next) => {

  console.log('Query parameters');
  const { 
    page = 1, 
    limit = 10, 
    search, 
    status, 
    discountType,
    sortBy = 'createdAt',
    sortOrder = 'desc' 
  } = req.query;
  
  const query = {};
  
  // Search filter
  if (search) {
    query.$or = [
      { code: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Status filter
  if (status === 'active') {
    query.isActive = true;
    query.endDate = { $gte: new Date() };
  } else if (status === 'inactive') {
    query.$or = [
      { isActive: false },
      { endDate: { $lt: new Date() } }
    ];
  }
  
  // Discount type filter
  if (discountType) {
    query.discountType = discountType;
  }
  
  // Pagination
  const skip = (page - 1) * limit;
  
  // Sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
  const coupons = await Coupon.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name email');
    
  const total = await Coupon.countDocuments(query);
  
  // Calculate statistics
  const activeCoupons = await Coupon.countDocuments({ 
    isActive: true, 
    endDate: { $gte: new Date() } 
  });
  
  const expiredCoupons = await Coupon.countDocuments({ 
    endDate: { $lt: new Date() } 
  });
  
  const totalUsage = await Coupon.aggregate([
    { $group: { _id: null, total: { $sum: '$usedCount' } } }
  ]);
  
  res.status(200).json({
    success: true,
    count: coupons.length,
    total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    stats: {
      total,
      active: activeCoupons,
      expired: expiredCoupons,
      totalUsage: totalUsage[0]?.total || 0
    },
    data: coupons
  });
}

// Get single coupon by ID
exports.getCouponById = async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('usedBy.userId', 'name email')
    .populate('usedBy.orderId', 'orderNumber totalAmount');
  
  if (!coupon) {
    return 'Coupon not found'
  }
  
  res.status(200).json({
    success: true,
    data: coupon
  });
}

// Update coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }
    
    // Validate title length if being updated
    if (req.body.title && req.body.title.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters'
      });
    }
    
    // Check if code is being changed and if new code already exists
    if (req.body.code && req.body.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ 
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }
      req.body.code = req.body.code.toUpperCase();
    }
    
    // Validate dates if being updated
    if (req.body.startDate || req.body.endDate) {
      const startDate = req.body.startDate ? new Date(req.body.startDate) : coupon.startDate;
      const endDate = req.body.endDate ? new Date(req.body.endDate) : coupon.endDate;
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }
    
    // Validate discount value if being updated
    if (req.body.discountValue && req.body.discountType === 'percentage') {
      const discountValue = parseFloat(req.body.discountValue);
      if (discountValue < 0 || discountValue > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount must be between 0 and 100'
        });
      }
    }
    
    // Update coupon fields
    const updateFields = ['title', 'description', 'discountType', 'discountValue', 
                         'minOrderAmount', 'maxDiscountAmount', 'startDate', 'endDate', 
                         'userLimit', 'showFrontend', 'isActive', 'color'];
    
    updateFields.forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'discountValue' || key === 'minOrderAmount' || key === 'maxDiscountAmount') {
          coupon[key] = parseFloat(req.body[key]);
        } else if (key === 'userLimit') {
          coupon[key] = parseInt(req.body[key]);
        } else if (key === 'startDate' || key === 'endDate') {
          coupon[key] = new Date(req.body[key]);
        } else if (key === 'code' && req.body.code) {
          coupon[key] = req.body.code.toUpperCase();
        } else {
          coupon[key] = req.body[key];
        }
      }
    });
    
    await coupon.save();
    
    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon
    });
    
  } catch (error) {
    console.error('Error in updateCoupon:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error updating coupon',
      error: error.message
    });
  }
}

// Delete coupon
exports.deleteCoupon = async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  
  if (!coupon) {
    return 'Coupon not found'
  }
  
  // Check if coupon has been used
  if (coupon.usedCount > 0) {
    return 'Cannot delete coupon that has been used'
  }
  
  await coupon.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Coupon deleted successfully'
  });
}

// Toggle active status
exports.toggleStatus = async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  
  if (!coupon) {
    return 'Coupon not found'
  }
  
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  
  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
    data: coupon
  });
}

// Toggle frontend visibility
exports.toggleVisibility = async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  
  if (!coupon) {
    return 'Coupon not found'
  }
  
  coupon.showFrontend = !coupon.showFrontend;
  await coupon.save();
  
  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.showFrontend ? 'shown' : 'hidden'} on frontend`,
    data: coupon
  });
}

// Apply coupon to order
exports.applyCoupon = async (req, res, next) => {
  const { code, orderAmount } = req.body;
  
  if (!code || !orderAmount) {
    return 'Coupon code and order amount are required'
  }
  
  const result = await Coupon.validateCoupon(code, parseFloat(orderAmount));
  
  if (!result.valid) {
    return result.message
  }
  
  res.status(200).json({
    success: true,
    message: 'Coupon applied successfully',
    data: {
      coupon: result.coupon,
      discount: result.discount,
      finalAmount: result.finalAmount
    }
  });
}

// Record coupon usage
exports.recordUsage = async (req, res, next) => {
  const { orderId, orderAmount, userId } = req.body;
  
  const coupon = await Coupon.findById(req.params.id);
  
  if (!coupon) {
    return 'Coupon not found'
  }
  
  // Validate coupon
  const validation = await Coupon.validateCoupon(coupon.code, orderAmount);
  if (!validation.valid) {
    return validation.message
  }
  
  // Calculate discount
  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else if (coupon.discountType === 'fixed') {
    discount = coupon.discountValue;
  }
  
  // Record usage
  coupon.usedCount += 1;
  coupon.usedBy.push({
    userId,
    orderId,
    orderAmount,
    discountApplied: discount
  });
  
  await coupon.save();
  
  res.status(200).json({
    success: true,
    message: 'Coupon usage recorded',
    data: {
      coupon,
      discount,
      finalAmount: orderAmount - discount
    }
  });
}

// Get coupon statistics
exports.getStats = async (req, res, next) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const stats = await Coupon.aggregate([
    // Total coupons
    { $group: { _id: null, totalCoupons: { $sum: 1 } } },
    
    // Active coupons
    { $match: { isActive: true, endDate: { $gte: new Date() } } },
    { $group: { _id: null, activeCoupons: { $sum: 1 } } },
    
    // Total usage
    { $group: { _id: null, totalUsage: { $sum: '$usedCount' } } },
    
    // Expired coupons
    { $match: { endDate: { $lt: new Date() } } },
    { $group: { _id: null, expiredCoupons: { $sum: 1 } } },
    
    // Recent usage (last 30 days)
    { $unwind: '$usedBy' },
    { $match: { 'usedBy.usedAt': { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, recentUsage: { $sum: 1 } } }
  ]);
  
  // Discount type distribution
  const discountDistribution = await Coupon.aggregate([
    { $group: { _id: '$discountType', count: { $sum: 1 } } }
  ]);
  
  // Top coupons by usage
  const topCoupons = await Coupon.find()
    .sort({ usedCount: -1 })
    .limit(5)
    .select('code title usedCount userLimit');
  
  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      discountDistribution,
      topCoupons
    }
  });
}
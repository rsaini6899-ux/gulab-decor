const Coupon = require('../models/coupon');

// Create new coupon
// exports.createCoupon = async (req, res, next) => {
//   try {
//     const {
//       code,
//       title,
//       description,
//       discountType,
//       discountValue,
//       minOrderAmount,
//       maxDiscountAmount,
//       startDate,
//       endDate,
//       userLimit,
//       showFrontend,
//       isActive,
//       color
//     } = req.body;
    
//     // Validate title length
//     if (title && title.length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: 'Title must be at least 3 characters'
//       });
//     }
    
//     // Check if coupon code already exists
//     const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
//     if (existingCoupon) {
//       return res.status(400).json({
//         success: false,
//         message: 'Coupon code already exists'
//       });
//     }
    
//     // Validate dates
//     if (new Date(startDate) >= new Date(endDate)) {
//       return res.status(400).json({
//         success: false,
//         message: 'End date must be after start date'
//       });
//     }
    
//     // Validate discount value
//     if (discountType === 'percentage' && (parseFloat(discountValue) < 0 || parseFloat(discountValue) > 100)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Percentage discount must be between 0 and 100'
//       });
//     }
    
//     const coupon = await Coupon.create({
//       code: code.toUpperCase(),
//       title: title.trim(),
//       description: description ? description.trim() : '',
//       discountType,
//       discountValue: parseFloat(discountValue),
//       minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
//       maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
//       startDate: new Date(startDate),
//       endDate: new Date(endDate),
//       userLimit: parseInt(userLimit),
//       showFrontend,
//       isActive,
//       color,
//       createdBy: req.user?._id || null
//     });
    
//     res.status(201).json({
//       success: true,
//       message: 'Coupon created successfully',
//       data: coupon
//     });
    
//   } catch (error) {
//     console.error('Error in createCoupon:', error);
    
//     // Handle mongoose validation errors
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         errors: messages
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: 'Server error creating coupon',
//       error: error.message
//     });
//   }
// }
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
      perUserLimit,  // 🆕 NEW फील्ड
      showFrontend,
      isActive,
      color
    } = req.body;
    
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
    
    // 🆕 NEW: Validate perUserLimit
    const parsedPerUserLimit = perUserLimit ? parseInt(perUserLimit) : 1;
    if (parsedPerUserLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Per user limit must be at least 1'
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
      perUserLimit: parsedPerUserLimit,  // 🆕 NEW
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
// exports.getAllCoupons = async (req, res, next) => {
  
//   const { 
//     page = 1, 
//     limit = 10, 
//     search, 
//     status, 
//     discountType,
//     sortBy = 'createdAt',
//     sortOrder = 'desc' 
//   } = req.query;
  
//   const query = {};
  
//   // Search filter
//   if (search) {
//     query.$or = [
//       { code: { $regex: search, $options: 'i' } },
//       { title: { $regex: search, $options: 'i' } },
//       { description: { $regex: search, $options: 'i' } }
//     ];
//   }
  
//   // Status filter
//   if (status === 'active') {
//     query.isActive = true;
//     query.endDate = { $gte: new Date() };
//   } else if (status === 'inactive') {
//     query.$or = [
//       { isActive: false },
//       { endDate: { $lt: new Date() } }
//     ];
//   }
  
//   // Discount type filter
//   if (discountType) {
//     query.discountType = discountType;
//   }
  
//   // Pagination
//   const skip = (page - 1) * limit;
  
//   // Sorting
//   const sort = {};
//   sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
//   const coupons = await Coupon.find(query)
//     .sort(sort)
//     .skip(skip)
//     .limit(parseInt(limit))
//     .populate('createdBy', 'name email');
    
//   const total = await Coupon.countDocuments(query);
  
//   // Calculate statistics
//   const activeCoupons = await Coupon.countDocuments({ 
//     isActive: true, 
//     endDate: { $gte: new Date() } 
//   });
  
//   const expiredCoupons = await Coupon.countDocuments({ 
//     endDate: { $lt: new Date() } 
//   });
  
//   const totalUsage = await Coupon.aggregate([
//     { $group: { _id: null, total: { $sum: '$usedCount' } } }
//   ]);
  
//   res.status(200).json({
//     success: true,
//     count: coupons.length,
//     total,
//     currentPage: parseInt(page),
//     totalPages: Math.ceil(total / limit),
//     stats: {
//       total,
//       active: activeCoupons,
//       expired: expiredCoupons,
//       totalUsage: totalUsage[0]?.total || 0
//     },
//     data: coupons
//   });
// }
exports.getAllCoupons = async (req, res, next) => {
  
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
// exports.getCouponById = async (req, res, next) => {
//   const coupon = await Coupon.findById(req.params.id)
//     .populate('createdBy', 'name email')
//     .populate('usedBy.userId', 'name email')
//     .populate('usedBy.orderId', 'orderNumber totalAmount');
  
//   if (!coupon) {
//     return 'Coupon not found'
//   }
  
//   res.status(200).json({
//     success: true,
//     data: coupon
//   });
// }
exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('usedBy.userId', 'name email')
      .populate('usedBy.orderId', 'orderNumber totalAmount');
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }
    
    // 🆕 NEW: प्रति यूजर यूसेज डिटेल्स जोड़ें
    const userUsageStats = [];
    const userMap = new Map();
    
    coupon.usedBy.forEach(entry => {
      const userId = entry.userId?._id?.toString() || entry.userId?.toString();
      if (userId) {
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId: entry.userId,
            totalUses: 0,
            totalDiscount: 0,
            orders: []
          });
        }
        
        const userStat = userMap.get(userId);
        userStat.totalUses += (entry.usageCount || 1);
        userStat.totalDiscount += entry.discountApplied;
        userStat.orders.push({
          orderId: entry.orderId,
          usedAt: entry.usedAt,
          discountApplied: entry.discountApplied,
          orderAmount: entry.orderAmount,
          usageCount: entry.usageCount || 1
        });
      }
    });
    
    // Convert map to array
    userUsageStats.push(...userMap.values());
    
    const couponData = coupon.toObject();
    couponData.userUsageStats = userUsageStats;
    
    res.status(200).json({
      success: true,
      data: couponData
    });
  } catch (error) {
    console.error('Error in getCouponById:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coupon',
      error: error.message
    });
  }
}


// Update coupon
// exports.updateCoupon = async (req, res, next) => {
//   try {
//     const coupon = await Coupon.findById(req.params.id);
    
//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: 'Coupon not found'
//       });
//     }
    
//     // Validate title length if being updated
//     if (req.body.title && req.body.title.length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: 'Title must be at least 3 characters'
//       });
//     }
    
//     // Check if code is being changed and if new code already exists
//     if (req.body.code && req.body.code !== coupon.code) {
//       const existingCoupon = await Coupon.findOne({ 
//         code: req.body.code.toUpperCase(),
//         _id: { $ne: req.params.id }
//       });
      
//       if (existingCoupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'Coupon code already exists'
//         });
//       }
//       req.body.code = req.body.code.toUpperCase();
//     }
    
//     // Validate dates if being updated
//     if (req.body.startDate || req.body.endDate) {
//       const startDate = req.body.startDate ? new Date(req.body.startDate) : coupon.startDate;
//       const endDate = req.body.endDate ? new Date(req.body.endDate) : coupon.endDate;
      
//       if (startDate >= endDate) {
//         return res.status(400).json({
//           success: false,
//           message: 'End date must be after start date'
//         });
//       }
//     }
    
//     // Validate discount value if being updated
//     if (req.body.discountValue && req.body.discountType === 'percentage') {
//       const discountValue = parseFloat(req.body.discountValue);
//       if (discountValue < 0 || discountValue > 100) {
//         return res.status(400).json({
//           success: false,
//           message: 'Percentage discount must be between 0 and 100'
//         });
//       }
//     }
    
//     // Update coupon fields
//     const updateFields = ['title', 'description', 'discountType', 'discountValue', 
//                          'minOrderAmount', 'maxDiscountAmount', 'startDate', 'endDate', 
//                          'userLimit', 'showFrontend', 'isActive', 'color'];
    
//     updateFields.forEach(key => {
//       if (req.body[key] !== undefined) {
//         if (key === 'discountValue' || key === 'minOrderAmount' || key === 'maxDiscountAmount') {
//           coupon[key] = parseFloat(req.body[key]);
//         } else if (key === 'userLimit') {
//           coupon[key] = parseInt(req.body[key]);
//         } else if (key === 'startDate' || key === 'endDate') {
//           coupon[key] = new Date(req.body[key]);
//         } else if (key === 'code' && req.body.code) {
//           coupon[key] = req.body.code.toUpperCase();
//         } else {
//           coupon[key] = req.body[key];
//         }
//       }
//     });
    
//     await coupon.save();
    
//     res.status(200).json({
//       success: true,
//       message: 'Coupon updated successfully',
//       data: coupon
//     });
    
//   } catch (error) {
//     console.error('Error in updateCoupon:', error);
    
//     // Handle mongoose validation errors
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         errors: messages
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: 'Server error updating coupon',
//       error: error.message
//     });
//   }
// }
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
    
    // Validate perUserLimit if being updated
    if (req.body.perUserLimit) {
      const perUserLimit = parseInt(req.body.perUserLimit);
      if (perUserLimit < 1) {
        return res.status(400).json({
          success: false,
          message: 'Per user limit must be at least 1'
        });
      }
    }
    
    // 🎯 IMPORTANT: Fix NaN issue - Properly handle null/empty values
    const updateFields = ['title', 'description', 'discountType', 
                         'startDate', 'endDate', 'userLimit', 'perUserLimit', 
                         'showFrontend', 'isActive', 'color'];
    
    // Number fields with special handling for null/empty
    const numberFields = ['discountValue', 'minOrderAmount', 'maxDiscountAmount'];
    
    // Update string/date/boolean fields
    updateFields.forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'startDate' || key === 'endDate') {
          coupon[key] = new Date(req.body[key]);
        } else if (key === 'userLimit' || key === 'perUserLimit') {
          coupon[key] = parseInt(req.body[key]);
        } else if (key === 'code' && req.body.code) {
          coupon[key] = req.body.code.toUpperCase();
        } else {
          coupon[key] = req.body[key];
        }
      }
    });
    
    // 🎯 Update number fields with proper null handling
    numberFields.forEach(key => {
      if (req.body[key] !== undefined) {
        let value = req.body[key];
        
        // Handle empty string, null, undefined
        if (value === '' || value === null || value === undefined) {
          if (key === 'maxDiscountAmount') {
            coupon[key] = null;  // maxDiscountAmount null हो सकता है
          } else {
            coupon[key] = 0;  // बाकी फील्ड्स के लिए 0
          }
        } else {
          // Parse to float and validate
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            coupon[key] = numValue;
          } else {
            // Invalid number, use default
            coupon[key] = key === 'maxDiscountAmount' ? null : 0;
          }
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

// exports.validateCouponForCustomer = async (req, res, next) => {
//   try {
//     const userId = req.user?.id; // Agar user login hai to
    
//     const coupons = await Coupon.find({ 
//       isActive: true, 
//       endDate: { $gte: new Date() },
//       showFrontend: true
//     }).select('code title description discountType discountValue minOrderAmount maxDiscountAmount startDate endDate userLimit perUserLimit usedCount usedBy');
    
//     // 🎯 Add userAlreadyUsed and user usage info for each coupon
//     const couponsWithUserInfo = coupons.map(coupon => {
//       const couponObj = coupon.toObject();
      
//       if (userId) {
//         const userUsageCount = coupon.getUserUsageCount(userId);
//         couponObj.userAlreadyUsed = userUsageCount > 0;
//         couponObj.userUsageCount = userUsageCount;
//         couponObj.remainingUserUses = coupon.perUserLimit - userUsageCount;
//         couponObj.perUserLimit = coupon.perUserLimit;
//       } else {
//         couponObj.userAlreadyUsed = false;
//         couponObj.userUsageCount = 0;
//         couponObj.remainingUserUses = coupon.perUserLimit;
//       }
      
//       // Calculate remaining uses
//       couponObj.remainingUses = coupon.userLimit - coupon.usedCount;
      
//       return couponObj;
//     });
    
//     res.status(200).json({
//       success: true,
//       data: couponsWithUserInfo
//     });
//   } catch (error) {
//     console.error('Error fetching coupons:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error fetching coupons',
//       error: error.message
//     });
//   }
// };

exports.validateCouponForCustomer = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    const coupons = await Coupon.find({ 
      isActive: true, 
      endDate: { $gte: new Date() },
      showFrontend: true
    }).select('code title description discountType discountValue minOrderAmount maxDiscountAmount startDate endDate userLimit perUserLimit usedCount usedBy');
    
    // 🎯 Filter coupons based on user usage
    const couponsWithUserInfo = coupons
      .map(coupon => {
        const couponObj = coupon.toObject();
        
        if (userId) {
          const userUsageCount = coupon.getUserUsageCount(userId);
          couponObj.userAlreadyUsed = userUsageCount > 0;
          couponObj.userUsageCount = userUsageCount;
          couponObj.remainingUserUses = coupon.perUserLimit - userUsageCount;
          couponObj.perUserLimit = coupon.perUserLimit;
          couponObj.hasReachedUserLimit = userUsageCount >= coupon.perUserLimit;
        } else {
          couponObj.userAlreadyUsed = false;
          couponObj.userUsageCount = 0;
          couponObj.remainingUserUses = coupon.perUserLimit;
          couponObj.hasReachedUserLimit = false;
        }
        
        couponObj.remainingUses = coupon.userLimit - coupon.usedCount;
        couponObj.hasReachedTotalLimit = coupon.usedCount >= coupon.userLimit;
        couponObj.isExpired = coupon.endDate < new Date();
        
        return couponObj;
      })
      // 🎯 CRITICAL: Filter out coupons that user cannot use
      .filter(coupon => {
        // Don't show if total limit reached
        if (coupon.hasReachedTotalLimit) return false;
        // Don't show if expired
        if (coupon.isExpired) return false;
        // Don't show if user has reached per-user limit
        if (userId && coupon.hasReachedUserLimit) return false;
        // Don't show if min order amount not met (will be checked separately)
        return true;
      });
    
    res.status(200).json({
      success: true,
      data: couponsWithUserInfo
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coupons',
      error: error.message
    });
  }
};


// Apply coupon to order
exports.applyCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const userId = req.user?.id; // Get user ID from auth middleware
    
    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and order amount are required'
      });
    }
    
    // Find coupon
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(), 
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    
    console.log('Found coupon:', coupon ? {
      id: coupon._id,
      code: coupon.code,
      usedCount: coupon.usedCount,
      userLimit: coupon.userLimit,
      perUserLimit: coupon.perUserLimit,  // 🆕 NEW
      usedBy: coupon.usedBy.map(u => ({
        userId: u.userId?.toString(),
        usageCount: u.usageCount,
        usedAt: u.usedAt
      }))
    } : 'No coupon found');
    
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon'
      });
    }
    
    // 🎯 IMPORTANT: Check total usage limit
    if (coupon.usedCount >= coupon.userLimit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit reached'
      });
    }
    
    // 🎯 IMPORTANT: Check per-user usage limit
    if (userId) {
      console.log('Checking per-user limit for user:', userId);
      
      // कैलकुलेट करें कि इस यूजर ने कितनी बार यूज किया है
      const userUsageCount = coupon.getUserUsageCount(userId);
      console.log(`User ${userId} has used this coupon ${userUsageCount} time(s)`);
      
      if (userUsageCount >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: `You have already used this coupon ${userUsageCount} time(s). Maximum ${coupon.perUserLimit} time(s) allowed per user.`
        });
      }
    } else {
      console.log('No userId found in request!');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Check minimum order amount
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${coupon.minOrderAmount}`
      });
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
    
    // Round discount to 2 decimal places
    discount = Math.round(discount * 100) / 100;
    
    // Prepare coupon object for response
    const couponObj = coupon.toObject();
    
    // Add userAlreadyUsed flag
    const userUsageCount = coupon.getUserUsageCount(userId);
    couponObj.userAlreadyUsed = userUsageCount > 0;
    couponObj.userUsageCount = userUsageCount;
    couponObj.remainingUserUses = coupon.perUserLimit - userUsageCount;
    
    console.log('Sending response:', {
      userAlreadyUsed: couponObj.userAlreadyUsed,
      userUsageCount: couponObj.userUsageCount,
      remainingUserUses: couponObj.remainingUserUses,
      perUserLimit: coupon.perUserLimit
    });
    
    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        coupon: couponObj,
        discount,
        finalAmount: orderAmount - discount,
        userUsageInfo: {
          usedCount: userUsageCount,
          remainingUses: coupon.perUserLimit - userUsageCount,
          totalAllowed: coupon.perUserLimit
        }
      }
    });
    
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying coupon',
      error: error.message
    });
  }
};


// Record coupon usage
exports.recordUsage = async (req, res, next) => {
  try {
    const { orderId, orderAmount, userId } = req.body;
    
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }
    
    // Validate coupon using the static method
    const validation = await Coupon.validateCoupon(coupon.code, orderAmount, userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
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
    
    // 🆕 NEW: Check if this user has already used this coupon
    const existingUserEntry = coupon.usedBy.find(entry => 
      entry.userId && entry.userId.toString() === userId.toString()
    );
    
    if (existingUserEntry) {
      // अगर यूजर पहले से मौजूद है, तो उसकी यूसेज काउंट बढ़ाएं
      existingUserEntry.usageCount = (existingUserEntry.usageCount || 1) + 1;
      existingUserEntry.usedAt = new Date(); // लेटेस्ट यूसेज डेट अपडेट करें
      existingUserEntry.orderId = orderId;
      existingUserEntry.orderAmount = orderAmount;
      existingUserEntry.discountApplied = discount;
    } else {
      // नया यूजर है, नया एंट्री बनाएं
      coupon.usedBy.push({
        userId,
        orderId,
        orderAmount,
        discountApplied: discount,
        usageCount: 1,
        usedAt: new Date()
      });
    }
    
    // कुल यूसेज काउंट बढ़ाएं
    coupon.usedCount += 1;
    
    await coupon.save();
    
    // 🆕 NEW: Get updated user usage count
    const userTotalUsage = coupon.getUserUsageCount(userId);
    
    res.status(200).json({
      success: true,
      message: 'Coupon usage recorded',
      data: {
        coupon,
        discount,
        finalAmount: orderAmount - discount,
        userUsageInfo: {
          totalUserUses: userTotalUsage,
          remainingUserUses: coupon.perUserLimit - userTotalUsage,
          totalAllowed: coupon.perUserLimit
        }
      }
    });
    
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording usage',
      error: error.message
    });
  }
};

// Get coupon statistics
exports.getStats = async (req, res, next) => {
  try {
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
      .select('code title usedCount userLimit perUserLimit');
    
    // 🆕 NEW: Top users by coupon usage (which users used coupons most)
    const topUsers = await Coupon.aggregate([
      { $unwind: '$usedBy' },
      {
        $group: {
          _id: '$usedBy.userId',
          totalUsageCount: { $sum: '$usedBy.usageCount' },
          totalDiscount: { $sum: '$usedBy.discountApplied' },
          couponsUsed: { $addToSet: '$code' }
        }
      },
      { $sort: { totalUsageCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          totalUsageCount: 1,
          totalDiscount: 1,
          couponsUsed: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {},
        discountDistribution,
        topCoupons,
        topUsers  // 🆕 NEW
      }
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats',
      error: error.message
    });
  }
};
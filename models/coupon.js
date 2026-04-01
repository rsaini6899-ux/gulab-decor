// const mongoose = require('mongoose');

// const couponSchema = new mongoose.Schema({
//   code: {
//     type: String,
//     required: [true, 'Coupon code is required'],
//     unique: true,
//     uppercase: true,
//     trim: true,
//     minlength: [4, 'Coupon code must be at least 4 characters'],
//     maxlength: [20, 'Coupon code cannot exceed 20 characters']
//   },
  
//   title: {
//     type: String,
//     required: [true, 'Coupon title is required'],
//     trim: true,
//     minlength: [3, 'Title must be at least 3 characters'],
//     maxlength: [100, 'Title cannot exceed 100 characters']
//   },
  
//   description: {
//     type: String,
//     trim: true,
//     maxlength: [500, 'Description cannot exceed 500 characters']
//   },
  
//   discountType: {
//     type: String,
//     required: true,
//     enum: ['percentage', 'fixed', 'shipping'],
//     default: 'percentage'
//   },
  
//   discountValue: {
//     type: Number,
//     required: true,
//     min: [0, 'Discount value cannot be negative']
//   },
  
//   minOrderAmount: {
//     type: Number,
//     default: 0,
//     min: [0, 'Minimum order amount cannot be negative']
//   },
  
//   maxDiscountAmount: {
//     type: Number,
//     default: null
//   },
  
//   startDate: {
//     type: Date,
//     required: [true, 'Start date is required']
//   },
  
//   endDate: {
//     type: Date,
//     required: [true, 'End date is required']
//   },
  
//   userLimit: {
//     type: Number,
//     required: [true, 'User limit is required'],
//     min: [1, 'User limit must be at least 1']
//   },
  
//   usedCount: {
//     type: Number,
//     default: 0,
//     min: [0, 'Used count cannot be negative']
//   },
  
//   showFrontend: {
//     type: Boolean,
//     default: true
//   },
  
//   isActive: {
//     type: Boolean,
//     default: true
//   },
  
//   color: {
//     type: String,
//     default: 'from-blue-500 to-purple-600'
//   },
  
//   usageRate: {
//     type: Number,
//     default: 0
//   },
  
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
  
//   usedBy: [{
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     orderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Order'
//     },
//     usedAt: {
//       type: Date,
//       default: Date.now
//     },
//     orderAmount: {
//       type: Number,
//       required: true
//     },
//     discountApplied: {
//       type: Number,
//       required: true
//     }
//   }]
// }, {
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // Virtual for checking if coupon is expired
// couponSchema.virtual('isExpired').get(function() {
//   return this.endDate < new Date();
// });

// // Virtual for checking if coupon is valid (not expired and within usage limit)
// couponSchema.virtual('isValid').get(function() {
//   const now = new Date();
//   return this.isActive && 
//          this.startDate <= now && 
//          this.endDate >= now && 
//          this.usedCount < this.userLimit;
// });

// // Virtual for remaining uses
// couponSchema.virtual('remainingUses').get(function() {
//   return this.userLimit - this.usedCount;
// });

// // Pre-save middleware to update usage rate
// couponSchema.pre('save', function(next) {
//   if (this.userLimit > 0) {
//     this.usageRate = (this.usedCount / this.userLimit) * 100;
//   }
//   next();
// });

// // Static method to validate coupon
// couponSchema.statics.validateCoupon = async function(code, orderAmount = 0, userId = null) {
//   const coupon = await this.findOne({ 
//     code: code.toUpperCase(), 
//     isActive: true,
//     startDate: { $lte: new Date() },
//     endDate: { $gte: new Date() }
//   });
  
//   if (!coupon) {
//     return { valid: false, message: 'Invalid or expired coupon' };
//   }
  
//   if (coupon.usedCount >= coupon.userLimit) {
//     return { valid: false, message: 'Coupon usage limit reached' };
//   }
  
//   if (orderAmount < coupon.minOrderAmount) {
//     return { 
//       valid: false, 
//       message: `Minimum order amount is ₹${coupon.minOrderAmount}` 
//     };
//   }
  
//   // 🎯 Check if user has already used this coupon
//   if (userId) {
//     const userAlreadyUsed = coupon.usedBy.some(entry => 
//       entry.userId && entry.userId.toString() === userId.toString()
//     );
    
//     if (userAlreadyUsed) {
//       return { 
//         valid: false, 
//         message: 'You have already used this coupon' 
//       };
//     }
//   }
  
//   // Calculate discount
//   let discount = 0;
//   if (coupon.discountType === 'percentage') {
//     discount = (orderAmount * coupon.discountValue) / 100;
//     if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
//       discount = coupon.maxDiscountAmount;
//     }
//   } else if (coupon.discountType === 'fixed') {
//     discount = coupon.discountValue;
//   }
//   // shipping type discount is 0 (free shipping)
  
//   return {
//     valid: true,
//     coupon,
//     discount,
//     finalAmount: orderAmount - discount
//   };
// };

// module.exports = mongoose.model('Coupon', couponSchema);




// models/coupon.js - पूरा अपडेटेड कोड

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [4, 'Coupon code must be at least 4 characters'],
    maxlength: [20, 'Coupon code cannot exceed 20 characters']
  },
  
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed', 'shipping'],
    default: 'percentage'
  },
  
  discountValue: {
    type: Number,
    required: true,
    min: [0, 'Discount value cannot be negative']
  },
  
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  
  maxDiscountAmount: {
    type: Number,
    default: null
  },
  
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  
  userLimit: {
    type: Number,
    required: [true, 'User limit is required'],
    min: [1, 'User limit must be at least 1']
  },
  
  // 🆕 NEW: प्रति उपयोगकर्ता सीमा
  perUserLimit: {
    type: Number,
    default: 1,  // डिफॉल्ट: एक यूजर सिर्फ 1 बार उपयोग कर सकता है
    min: [1, 'Per user limit must be at least 1']
  },
  
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
  },
  
  showFrontend: {
    type: Boolean,
    default: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  color: {
    type: String,
    default: 'from-blue-500 to-purple-600'
  },
  
  usageRate: {
    type: Number,
    default: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderAmount: {
      type: Number,
      required: true
    },
    discountApplied: {
      type: Number,
      required: true
    },
    // 🆕 NEW: यह ट्रैक करने के लिए कि यह यूजर ने कितनी बार यूज किया है
    usageCount: {
      type: Number,
      default: 1
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if coupon is expired
couponSchema.virtual('isExpired').get(function() {
  return this.endDate < new Date();
});

// Virtual for checking if coupon is valid (not expired and within usage limit)
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now && 
         this.usedCount < this.userLimit;
});

// Virtual for remaining uses
couponSchema.virtual('remainingUses').get(function() {
  return this.userLimit - this.usedCount;
});

// 🆕 NEW: किसी विशेष यूजर द्वारा कितनी बार उपयोग किया गया
couponSchema.methods.getUserUsageCount = function(userId) {
  const userUsage = this.usedBy.filter(entry => 
    entry.userId && entry.userId.toString() === userId.toString()
  );
  
  // कुल उपयोग की संख्या
  return userUsage.reduce((total, entry) => total + (entry.usageCount || 1), 0);
};

// 🆕 NEW: जांचें कि क्या यूजर अपनी सीमा तक पहुंच गया है
couponSchema.methods.hasUserReachedLimit = function(userId) {
  const userUsageCount = this.getUserUsageCount(userId);
  return userUsageCount >= this.perUserLimit;
};

// Pre-save middleware to update usage rate
couponSchema.pre('save', function(next) {
  if (this.userLimit > 0) {
    this.usageRate = (this.usedCount / this.userLimit) * 100;
  }
  next();
});

// 🆕 NEW: Static method to validate coupon with per-user limit
couponSchema.statics.validateCoupon = async function(code, orderAmount = 0, userId = null) {
  const coupon = await this.findOne({ 
    code: code.toUpperCase(), 
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  });
  
  if (!coupon) {
    return { valid: false, message: 'Invalid or expired coupon' };
  }
  
  // कुल उपयोग सीमा की जांच
  if (coupon.usedCount >= coupon.userLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }
  
  // न्यूनतम ऑर्डर राशि की जांच
  if (orderAmount < coupon.minOrderAmount) {
    return { 
      valid: false, 
      message: `Minimum order amount is ₹${coupon.minOrderAmount}` 
    };
  }
  
  // 🎯 NEW: प्रति उपयोगकर्ता सीमा की जांच
  if (userId) {
    const userUsageCount = coupon.getUserUsageCount(userId);
    
    if (userUsageCount >= coupon.perUserLimit) {
      return { 
        valid: false, 
        message: `You have already used this coupon ${userUsageCount} time(s). Maximum ${coupon.perUserLimit} time(s) allowed per user.` 
      };
    }
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
  // shipping type discount is 0 (free shipping)
  
  return {
    valid: true,
    coupon,
    discount,
    finalAmount: orderAmount - discount
  };
};

module.exports = mongoose.model('Coupon', couponSchema);
// const mongoose = require('mongoose');

// const orderItemSchema = new mongoose.Schema({
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Product',
//     required: true
//   },
//   variant: {
//     type: mongoose.Schema.Types.ObjectId
//   },
//   name: {
//     type: String,
//     required: true
//   },
//   sku: String,
//   price: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 1,
//     default: 1
//   },
//   total: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   image: String,
//    color: String,
//   attributes: [{
//     name: String,
//     value: String,
//     unit: String
//   }],
//   productDetails: {
//     category: mongoose.Schema.Types.ObjectId,
//     brand: String,
//     attributes: [{
//       name: String,
//       value: String,
//       unit: String
//     }]
//   }
// });

// const shippingAddressSchema = new mongoose.Schema({
//     fullName: {
//     type: String,
//     required: true
//   },
//   email: {
//     type: String,
//   },
//   phone: {
//     type: String,
//     required: true
//   },
//   address: {
//     type: String,
//     required: true
//   },
//   city: {
//     type: String,
//     required: true
//   },
//   state: {
//     type: String,
//     required: true
//   },
//   country: {
//     type: String,
//     required: true,
//     default: 'India'
//   },
//   pincode: {
//     type: String,
//     required: true
//   },
//     landmark: {
//     type: String,
//     required: false
//   }
// },{ _id: false });

// const orderSchema = new mongoose.Schema({
//   orderId: {
//     type: String,
//     unique: true,
//     required: true
//   },
//   customer: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   items: [orderItemSchema],
//   shippingAddress: shippingAddressSchema,
//  billingAddress: {
//     type: shippingAddressSchema,
//     required: false
//   },

//   subtotal: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   shipping: {
//     type: Number,
//     required: true,
//     min: 0,
//     default: 0
//   },
//   tax: {
//     type: Number,
//     required: true,
//     min: 0,
//     default: 0
//   },
//   discount: {
//     type: Number,
//     min: 0,
//     default: 0
//   },
//   total: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['razorpay', 'cash_on_delivery', 'card', 'upi', 'netbanking'],
//     required: true
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
//     default: 'pending'
//   },
//   paymentDetails: {
//     transactionId: String,
//     paymentGateway: String,
//     razorpayOrderId: String,
//     razorpayPaymentId: String,
//     razorpaySignature: String,
//     cardLast4: String,
//     receiptUrl: String
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
//     default: 'pending'
//   },
//   shippingMethod: {
//     type: String,
//     required: true
//   },
//   trackingNumber: String,
//   shippingProvider: String,
//   estimatedDelivery: Date,
//   deliveredAt: Date,
//   notes: [{
//     note: String,
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     createdAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   refund: {
//     amount: Number,
//     reason: String,
//     status: {
//       type: String,
//       enum: ['requested', 'approved', 'rejected', 'processed']
//     },
//     processedAt: Date,
//     razorpayRefundId: String
//   },
//   ipAddress: String,
//   userAgent: String,
//   currency: {
//     type: String,
//     default: 'INR'
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//    isTemporary: {
//     type: Boolean,
//     default: false
//   },
//   paidAt: Date
// }, {
//   timestamps: true
// });

// // Generate order ID before saving
// orderSchema.pre('save', async function(next) {
//   if (!this.orderId) {
//     const year = new Date().getFullYear();
//     const prefix = 'ORD';
//     const count = await this.constructor.countDocuments();
//     this.orderId = `${prefix}-${year}${String(count + 1).padStart(6, '0')}`;
//   }

//     if (!this.billingAddress && this.shippingAddress) {
//     this.billingAddress = { ...this.shippingAddress };
//   }

//   next();
// });

// // Calculate totals before saving
// orderSchema.pre('save', function(next) {
//   // Calculate items total
//   const itemsTotal = this.items.reduce((sum, item) => {
//     return sum + (item.price * item.quantity);
//   }, 0);
  
//   this.subtotal = itemsTotal;
//   this.total = this.subtotal + this.shipping + this.tax - this.discount;
  
//   next();
// });

// // Update product stock when order status changes
// orderSchema.pre('save', async function(next) {
//   if (this.isModified('status')) {
//     const Product = mongoose.model('Product');
    
//     if (this.status === 'cancelled' || this.status === 'returned') {
//       // Restore stock
//       for (const item of this.items) {
//         const product = await Product.findById(item.product);
//         if (product) {
//           if (item.variation && product.variations) {
//             const variationIndex = product.variations.findIndex(v => 
//               v._id.toString() === item.variation.toString()
//             );
            
//             if (variationIndex !== -1) {
//               const updateField = `variations.${variationIndex}.stock`;
//               await Product.findByIdAndUpdate(item.product, {
//                 $inc: { 
//                   [updateField]: item.quantity,
//                   sold: -item.quantity 
//                 }
//               });
//             }
//           } else {
//             await Product.findByIdAndUpdate(item.product, {
//               $inc: { 
//                 stock: item.quantity,
//                 sold: -item.quantity 
//               }
//             });
//           }
//         }
//       }
//     } else if (this.status === 'confirmed' && this.paymentStatus === 'paid') {
//       // Reduce stock
//       for (const item of this.items) {
//         const product = await Product.findById(item.product);
//         if (product) {
//           if (item.variation && product.variations) {
//             const variationIndex = product.variations.findIndex(v => 
//               v._id.toString() === item.variation.toString()
//             );
            
//             if (variationIndex !== -1) {
//               const updateField = `variations.${variationIndex}.stock`;
//               await Product.findByIdAndUpdate(item.product, {
//                 $inc: { [updateField]: -item.quantity }
//               });
//             }
//           } else {
//             await Product.findByIdAndUpdate(item.product, {
//               $inc: { stock: -item.quantity }
//             });
//           }
          
//           // Update total sold count
//           await Product.findByIdAndUpdate(item.product, {
//             $inc: { sold: item.quantity }
//           });
//         }
//       }
//     }
//   }
//   next();
// });

// module.exports = mongoose.model('Order', orderSchema);


const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {  // ये variationId है
    type: mongoose.Schema.Types.ObjectId,
    required: true  // Required कर दो
  },
  name: {
    type: String,
    required: true
  },
  sku: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  image: String,
  color: String,
  attributes: [{
    name: String,
    value: String,
    unit: String
  }],
  productDetails: {
    category: mongoose.Schema.Types.ObjectId,
    brand: String,
    attributes: [{
      name: String,
      value: String,
      unit: String
    }]
  }
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'India'
  },
  pincode: {
    type: String,
    required: true
  },
  landmark: {
    type: String,
    required: false
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,
  billingAddress: {
    type: shippingAddressSchema,
    required: false
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discount: {
    type: Number,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cash_on_delivery', 'card', 'upi', 'netbanking'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    cardLast4: String,
    receiptUrl: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  shippingMethod: {
    type: String,
    required: true
  },
  trackingNumber: String,
  shippingProvider: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  notes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  refund: {
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'processed']
    },
    processedAt: Date,
    razorpayRefundId: String
  },
  ipAddress: String,
  userAgent: String,
  currency: {
    type: String,
    default: 'INR'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isTemporary: {
    type: Boolean,
    default: false
  },
  paidAt: Date
}, {
  timestamps: true
});

// Generate order ID before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const year = new Date().getFullYear();
    const prefix = 'ORD';
    const count = await this.constructor.countDocuments();
    this.orderId = `${prefix}-${year}${String(count + 1).padStart(6, '0')}`;
  }

  if (!this.billingAddress && this.shippingAddress) {
    this.billingAddress = { ...this.shippingAddress };
  }

  next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  // Calculate items total
  const itemsTotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  this.subtotal = itemsTotal;
  this.total = this.subtotal + this.shipping + this.tax - this.discount;
  
  next();
});

// Update product stock when order status changes
orderSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    const Product = mongoose.model('Product');
    
    if (this.status === 'cancelled' || this.status === 'returned') {
      // Restore stock
      for (const item of this.items) {
        const product = await Product.findById(item.product);
        if (product) {
          // अगर variation है तो variation का stock बढ़ाओ
          if (item.variant && product.variations) {
            const variationIndex = product.variations.findIndex(v => 
              v._id.toString() === item.variant.toString()
            );
            
            if (variationIndex !== -1) {
              const updateField = `variations.${variationIndex}.stock`;
              await Product.findByIdAndUpdate(item.product, {
                $inc: { 
                  [updateField]: item.quantity,
                  sold: -item.quantity 
                }
              });
            }
          } else {
            // वरना main product का stock बढ़ाओ
            await Product.findByIdAndUpdate(item.product, {
              $inc: { 
                stock: item.quantity,
                sold: -item.quantity 
              }
            });
          }
        }
      }
    } else if ((this.status === 'confirmed' && this.paymentStatus === 'paid') || 
               (this.paymentMethod === 'cash_on_delivery' && this.status === 'confirmed')) {
      // Stock पहले ही कम हो चुका है, बस sold count update करो
      for (const item of this.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { sold: item.quantity }
        });
      }
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
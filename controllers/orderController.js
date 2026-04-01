// const Order = require('../models/Order');
// const Customer = require('../models/User');

// const Product = require('../models/Product');
// const APIFeatures = require('../utils/APIFeatures');

// const Coupon = require('../models/coupon');

// const Cart = require('../models/cart');
// const User = require('../models/User');
// const Razorpay = require('razorpay');
// const crypto = require('crypto');

const APIFeatures = require('../utils/APIFeatures');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/cart');
const User = require('../models/User');
const Customer = require('../models/User');
const Coupon = require('../models/coupon');
const Razorpay = require('razorpay');
const RazorpaySettings = require('../models/razorpay');
const Shiprocket  = require('../models/shiprocket');
const crypto = require('crypto');
const shiprocketService = require('../utils/shiprocketService');
const emailService = require('../utils/orderMail');


// Initialize Razorpay with dynamic keys from DB
const getRazorpayInstance = async () => {
  const settings = await RazorpaySettings.findOne().sort({ createdAt: -1 });
  if (!settings) {
    throw new Error('Razorpay not configured');
  }
  
  return new Razorpay({
    key_id: settings.keyId,
    key_secret: settings.keySecret
  });
};

// ==================== COD ORDER ====================
// exports.createCODOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { shippingAddress, shippingMethod = 'standard', couponCode, discountAmount } = req.body;

//     // Get user cart
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       model: 'Product',
//       select: 'name price images variations colorImages category attributes stock sku comparePrice'
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cart is empty'
//       });
//     }

//     // Format shipping address
//     const formattedShippingAddress = {
//       fullName: shippingAddress?.fullName || '',
//       phone: shippingAddress?.phone || '',
//       email: shippingAddress?.email || '',
//       address: shippingAddress?.street || shippingAddress?.address || '',
//       city: shippingAddress?.city || '',
//       state: shippingAddress?.state || '',
//       country: shippingAddress?.country || 'India',
//       pincode: shippingAddress?.pincode || shippingAddress?.zipCode || '',
//       landmark: shippingAddress?.landmark || ''
//     };

//     // Validate address
//     const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
//     const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields: ${missingFields.join(', ')}`
//       });
//     }

//     // Calculate totals and prepare items
//     let subtotal = 0;
//     const items = [];

//     for (const cartItem of cart.items) {
//       const product = cartItem.productId;
//       if (!product) continue;

//       let variation = null;
//       let variationDetails = {};
      
//       if (cartItem.variationId && product.variations?.length > 0) {
//         variation = product.variations.find(v => 
//           v._id.toString() === cartItem.variationId.toString()
//         );
        
//         if (!variation) {
//           return res.status(400).json({
//             success: false,
//             message: `Variation not found for ${product.name}`
//           });
//         }

//         variationDetails = {
//           color: variation.color,
//           attributes: variation.attributes || [],
//           sku: variation.sku || product.sku,
//           price: variation.price,
//           stock: variation.stock
//         };
//       }

//       const price = variation?.price || product.price;
//       const availableStock = variation?.stock;
      
//       if (availableStock < cartItem.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.name} (${variation?.color || 'variation'})`
//         });
//       }

//       const itemTotal = price * cartItem.quantity;
//       subtotal += itemTotal;

//       // Get image
//       let image = product.images?.[0]?.url;
//       if (variation?.color && product.colorImages) {
//         const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
//         if (colorGroup?.images?.length > 0) {
//           const mainImg = colorGroup.images.find(img => img.isMain);
//           image = mainImg?.url || colorGroup.images[0].url;
//         }
//       }

//       items.push({
//         product: product._id,
//         variant: cartItem.variationId,
//         name: product.name,
//         sku: variationDetails.sku || product.sku,
//         price,
//         quantity: cartItem.quantity,
//         total: itemTotal,
//         image,
//         color: variationDetails.color || null,
//         attributes: variationDetails.attributes || [],
//         productDetails: {
//           category: product.category,
//           attributes: product.attributes || []
//         }
//       });
//     }

//     // Calculate shipping, tax
//     let shipping = 0;
//     switch (shippingMethod) {
//       case 'express': shipping = 199; break;
//       case 'priority': shipping = 299; break;
//       default: shipping = 99;
//     }

//     const tax = Math.round(subtotal * 0.18);
//     let total = subtotal + shipping + tax;
    
//     // Apply coupon
//     let appliedCoupon = null;
//     let finalDiscountAmount = 0;
    
//     if (couponCode && discountAmount) {
//       const coupon = await Coupon.findOne({ 
//         code: couponCode.toUpperCase(),
//         isActive: true,
//         startDate: { $lte: new Date() },
//         endDate: { $gte: new Date() }
//       });
      
//       if (!coupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid or expired coupon'
//         });
//       }
      
//       const userUsedCoupon = coupon.usedBy.some(entry => 
//         entry.userId?.toString() === userId.toString()
//       );
      
//       if (userUsedCoupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'You have already used this coupon'
//         });
//       }
      
//       if (coupon.usedCount >= coupon.userLimit) {
//         return res.status(400).json({
//           success: false,
//           message: 'Coupon usage limit reached'
//         });
//       }
      
//       if (subtotal < coupon.minOrderAmount) {
//         return res.status(400).json({
//           success: false,
//           message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`
//         });
//       }
      
//       let calculatedDiscount = 0;
//       if (coupon.discountType === 'percentage') {
//         calculatedDiscount = (subtotal * coupon.discountValue) / 100;
//         if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
//           calculatedDiscount = coupon.maxDiscountAmount;
//         }
//       } else {
//         calculatedDiscount = coupon.discountValue;
//       }
      
//       if (Math.abs(calculatedDiscount - discountAmount) > 1) {
//         return res.status(400).json({
//           success: false,
//           message: 'Discount amount mismatch'
//         });
//       }
      
//       finalDiscountAmount = calculatedDiscount;
//       appliedCoupon = coupon;
//       total = total - finalDiscountAmount;
//     }

//     // Generate order ID
//     const year = new Date().getFullYear();
//     const count = await Order.countDocuments({ isTemporary: false });
//     const orderId = `ORD-${year}${String(count + 1).padStart(6, '0')}`;

//     // Create order
//     const order = await Order.create({
//       orderId,
//       customer: userId,
//       items,
//       shippingAddress: formattedShippingAddress,
//       billingAddress: formattedShippingAddress,
//       shippingMethod,
//       subtotal,
//       shipping,
//       tax,
//       total,
//       couponCode: appliedCoupon?.code || null,
//       discountAmount: finalDiscountAmount,
//       discountType: appliedCoupon?.discountType || null,
//       paymentMethod: 'cash_on_delivery',
//       paymentStatus: 'pending',
//       status: 'confirmed',
//       currency: 'INR',
//       createdBy: userId,
//       estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       notes: [{
//         note: finalDiscountAmount > 0 
//           ? `COD order created with coupon ${appliedCoupon?.code}. Discount: ₹${finalDiscountAmount}`
//           : 'COD order created'
//       }]
//     });

//     // Clear cart items
//     for (const item of order.items) {
//       await Cart.findOneAndUpdate(
//         { userId },
//         { 
//           $pull: { 
//             items: { 
//               productId: item.product,
//               variationId: item.variant
//             }
//           }
//         }
//       );
//     }

//     // Update stock
//     const stockUpdates = [];
//     for (const item of order.items) {
//       const product = await Product.findById(item.product);
//       if (product && item.variant) {
//         const variationIndex = product.variations.findIndex(v => 
//           v._id.toString() === item.variant.toString()
//         );
        
//         if (variationIndex !== -1) {
//           stockUpdates.push(
//             Product.findByIdAndUpdate(item.product, {
//               $inc: { [`variations.${variationIndex}.stock`]: -item.quantity }
//             })
//           );
//         }
//       }
//     }
//     await Promise.all(stockUpdates);

//     // Update coupon usage
//     if (appliedCoupon) {
//       appliedCoupon.usedCount += 1;
//       appliedCoupon.usedBy.push({
//         userId,
//         orderId: order._id,
//         usedAt: new Date(),
//         orderAmount: subtotal,
//         discountApplied: finalDiscountAmount
//       });
//       await appliedCoupon.save();
//     }

//     // Update user stats
//     await User.findByIdAndUpdate(userId, {
//       $push: { orders: order._id },
//       $inc: { totalOrders: 1, totalSpent: order.total },
//       lastOrderAt: new Date()
//     });

//     // Send email notification
//     const user = await User.findById(userId);
//     await emailService.sendOrderConfirmation(order, user);

//     // Prepare response
//     const orderSummary = {
//       orderId: order.orderId,
//       items: order.items.map(item => ({
//         name: item.name,
//         quantity: item.quantity,
//         price: item.price,
//         total: item.total
//       })),
//       subtotal: order.subtotal,
//       shipping: order.shipping,
//       tax: order.tax,
//       couponCode: order.couponCode,
//       discountAmount: order.discountAmount,
//       total: order.total,
//       orderDate: order.createdAt,
//       estimatedDelivery: order.estimatedDelivery,
//       shippingAddress: order.shippingAddress,
//       paymentMethod: 'Cash on Delivery',
//       paymentStatus: 'Pending',
//       status: 'Confirmed'
//     };

//     res.status(201).json({
//       success: true,
//       message: finalDiscountAmount > 0 
//         ? `Order created! You saved ₹${finalDiscountAmount}`
//         : 'Order created successfully',
//       data: { order: orderSummary }
//     });

//   } catch (error) {
//     console.error('Error creating COD order:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to create order'
//     });
//   }
// };
// ==================== COD ORDER WITH SHIPROCKET ====================
exports.createCODOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, shippingMethod = 'standard', couponCode, discountAmount } = req.body;

    // Get user cart
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      model: 'Product',
      select: 'name price images variations colorImages category attributes stock sku comparePrice'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Format shipping address
    const formattedShippingAddress = {
      fullName: shippingAddress?.fullName || '',
      phone: shippingAddress?.phone || '',
      email: shippingAddress?.email || '',
      address: shippingAddress?.street || shippingAddress?.address || '',
      city: shippingAddress?.city || '',
      state: shippingAddress?.state || '',
      country: shippingAddress?.country || 'India',
      pincode: shippingAddress?.pincode || shippingAddress?.zipCode || '',
      landmark: shippingAddress?.landmark || ''
    };

    // Validate address
    const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Calculate totals and prepare items
    let subtotal = 0;
    const items = [];

    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      if (!product) continue;

      let variation = null;
      let variationDetails = {};
      
      if (cartItem.variationId && product.variations?.length > 0) {
        variation = product.variations.find(v => 
          v._id.toString() === cartItem.variationId.toString()
        );
        
        if (!variation) {
          return res.status(400).json({
            success: false,
            message: `Variation not found for ${product.name}`
          });
        }

        variationDetails = {
          color: variation.color,
          attributes: variation.attributes || [],
          sku: variation.sku || product.sku,
          price: variation.price,
          stock: variation.stock
        };
      }

      const price = variation?.price || product.price;
      const availableStock = variation?.stock;

      
      if (availableStock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} (${variation?.color || 'variation'})`
        });
      }

      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;

      // Get image
      let image = product.images?.[0]?.url;
      if (variation?.color && product.colorImages) {
        const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
        if (colorGroup?.images?.length > 0) {
          const mainImg = colorGroup.images.find(img => img.isMain);
          image = mainImg?.url || colorGroup.images[0].url;
        }
      }

      items.push({
        product: product._id,
        variant: cartItem.variationId,
        name: product.name,
        sku: variationDetails.sku || product.sku,
        price,
        quantity: cartItem.quantity,
        total: itemTotal,
        image,
        color: variationDetails.color || null,
        attributes: variationDetails.attributes || [],
        productDetails: {
          category: product.category,
          attributes: product.attributes || []
        }
      });
    }

    // Calculate shipping, tax
    let shipping = 0;
    switch (shippingMethod) {
      case 'express': shipping = 199; break;
      case 'priority': shipping = 299; break;
      default: shipping = 99;
    }

    // const tax = Math.round(subtotal * 0.18);
    let total = subtotal + shipping;
    
    // Apply coupon
    let appliedCoupon = null;
    let finalDiscountAmount = 0;
    
    if (couponCode && discountAmount) {
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
      
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired coupon'
        });
      }
      
      const userUsedCoupon = coupon.usedBy.some(entry => 
        entry.userId?.toString() === userId.toString()
      );
      
      if (userUsedCoupon) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this coupon'
        });
      }
      
      if (coupon.usedCount >= coupon.userLimit) {
        return res.status(400).json({
          success: false,
          message: 'Coupon usage limit reached'
        });
      }
      
      if (subtotal < coupon.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`
        });
      }
      
      let calculatedDiscount = 0;
      if (coupon.discountType === 'percentage') {
        calculatedDiscount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
          calculatedDiscount = coupon.maxDiscountAmount;
        }
      } else {
        calculatedDiscount = coupon.discountValue;
      }

      
      if (Math.abs(calculatedDiscount - discountAmount) > 1) {
        return res.status(400).json({
          success: false,
          message: 'Discount amount mismatch'
        });
      }
      
      finalDiscountAmount = calculatedDiscount;
      appliedCoupon = coupon;
      total = total - finalDiscountAmount;
    }

    // Generate order ID
    const year = new Date().getFullYear();
    const count = await Order.countDocuments({ isTemporary: false });
    const orderId = `ORD-${year}${String(count + 1).padStart(6, '0')}`;

    // Create order
    const order = await Order.create({
      orderId,
      customer: userId,
      items,
      shippingAddress: formattedShippingAddress,
      billingAddress: formattedShippingAddress,
      shippingMethod,
      subtotal,
      shipping,
      // tax,
      total,
      couponCode: appliedCoupon?.code || null,
      discountAmount: finalDiscountAmount,
      discountType: appliedCoupon?.discountType || null,
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      status: 'confirmed',
      currency: 'INR',
      createdBy: userId,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: [{
        note: finalDiscountAmount > 0 
          ? `COD order created with coupon ${appliedCoupon?.code}. Discount: ₹${finalDiscountAmount}`
          : 'COD order created'
      }]
    });

    // Clear cart items
    for (const item of order.items) {
      await Cart.findOneAndUpdate(
        { userId },
        { 
          $pull: { 
            items: { 
              productId: item.product,
              variationId: item.variant
            }
          }
        }
      );
    }

    // Update stock
    const stockUpdates = [];
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product && item.variant) {
        const variationIndex = product.variations.findIndex(v => 
          v._id.toString() === item.variant.toString()
        );
        
        if (variationIndex !== -1) {
          stockUpdates.push(
            Product.findByIdAndUpdate(item.product, {
              $inc: { [`variations.${variationIndex}.stock`]: -item.quantity }
            })
          );
        }
      }
    }
    await Promise.all(stockUpdates);

    // Update coupon usage
    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      appliedCoupon.usedBy.push({
        userId,
        orderId: order._id,
        usedAt: new Date(),
        orderAmount: subtotal,
        discountApplied: finalDiscountAmount
      });
      await appliedCoupon.save();
    }

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $push: { orders: order._id },
      $inc: { totalOrders: 1, totalSpent: order.total },
      lastOrderAt: new Date()
    });

    // Send email notification
    const user = await User.findById(userId);
    await emailService.sendOrderConfirmation(order, user);

    // 🚀 TRY TO CREATE SHIPMENT (AUTOMATICALLY)
    let shipmentData = null;
    try {
      // Check if Shiprocket is configured
      const shiprocketSettings = await Shiprocket.findOne({ isEnabled: true });
      
      if (shiprocketSettings) {
        console.log('Shiprocket configured, creating shipment...');
        
        // Create shipment in Shiprocket
        shipmentData = await shiprocketService.createShipment(order);
        console.log('Shipment created:', shipmentData);
        
        // Generate label
        let labelData = null;
        if (shipmentData.shipment_id) {
          labelData = await shiprocketService.generateLabel(shipmentData.shipment_id);
        }

        console.log('Label generated:', labelData);

        // Update order with tracking info
        order.trackingNumber = shipmentData.awb_code;
        order.shippingProvider = 'Shiprocket';
        order.shipmentId = shipmentData.shipment_id;
        order.notes.push({
          note: `Shipment created automatically: AWB ${shipmentData.awb_code}`,
          createdBy: userId
        });
        await order.save();

        // Send shipment email
        await emailService.sendShipmentEmail(order, shipmentData);
      } else {
        console.log('Shiprocket not configured, skipping auto-shipment');
        order.notes.push({
          note: 'Shiprocket not configured. Please configure shipping settings.',
          createdBy: userId
        });
        await order.save();
      }
    } catch (shipmentError) {
      // Log error but don't fail the order
      console.error('❌ Shipment creation failed (auto):', shipmentError.message);
      order.notes.push({
        note: `Auto-shipment failed: ${shipmentError.message}. Will retry manually.`,
        createdBy: userId
      });
      await order.save();
    }

    // Prepare response
    const orderSummary = {
      orderId: order.orderId,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      // tax: order.tax,
      couponCode: order.couponCode,
      discountAmount: order.discountAmount,
      total: order.total,
      orderDate: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      shippingAddress: order.shippingAddress,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending',
      status: 'Confirmed'
    };

    // Add tracking info if available
    if (order.trackingNumber) {
      orderSummary.trackingNumber = order.trackingNumber;
      orderSummary.trackingUrl = `https://shiprocket.co/tracking/${order.trackingNumber}`;
    }

    res.status(201).json({
      success: true,
      message: finalDiscountAmount > 0 
        ? `Order created! You saved ₹${finalDiscountAmount}${order.trackingNumber ? ' & shipment created!' : ''}`
        : `Order created successfully${order.trackingNumber ? ' & shipment created!' : ''}`,
      data: { 
        order: orderSummary,
        shipment: shipmentData ? {
          awb: shipmentData.awb_code,
          courier: shipmentData.courier_name,
          trackingUrl: `https://shiprocket.co/tracking/${shipmentData.awb_code}`
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error creating COD order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// ==================== RAZORPAY ORDER ====================
exports.createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, shippingMethod = 'standard', couponCode, discountAmount } = req.body;

     console.log("User ID:", userId);
    console.log("Shipping Address:", shippingAddress);
    console.log("Shipping Method:", shippingMethod);
    console.log("Coupon Code:", couponCode);
    console.log("Discount Amount:", discountAmount);

    // Get razorpay instance with dynamic keys
    const razorpay = await getRazorpayInstance();

     console.log("Razorpay Instance:", razorpay);

    console.log('req.body:', req.body );
    console.log('Razorpay instance:', razorpay);


    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      model: 'Product',
      select: 'name price images variations colorImages category attributes stock sku'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const formattedShippingAddress = {
      fullName: shippingAddress?.fullName || '',
      phone: shippingAddress?.phone || '',
      email: shippingAddress?.email || '',
      address: shippingAddress?.street || shippingAddress?.address || '',
      city: shippingAddress?.city || '',
      state: shippingAddress?.state || '',
      country: shippingAddress?.country || 'India',
      pincode: shippingAddress?.pincode || shippingAddress?.zipCode || '',
      landmark: shippingAddress?.landmark || ''
    };

    const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Calculate totals (same as COD)
    let subtotal = 0;
    const items = [];

    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      if (!product) continue;

      let variation = null;
      let variationDetails = {};
      
      if (cartItem.variationId && product.variations?.length > 0) {
        variation = product.variations.find(v => 
          v._id.toString() === cartItem.variationId.toString()
        );
        
        if (!variation) {
          return res.status(400).json({
            success: false,
            message: `Variation not found for ${product.name}`
          });
        }

        variationDetails = {
          color: variation.color,
          attributes: variation.attributes || [],
          sku: variation.sku || product.sku,
          price: variation.price,
          stock: variation.stock
        };
      }

      const price = variation?.price || product.price;
      const availableStock = variation?.stock;
      
      if (availableStock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} (${variation?.color || 'variation'})`
        });
      }

      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;

      let image = product.images?.[0]?.url;
      if (variation?.color && product.colorImages) {
        const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
        if (colorGroup?.images?.length > 0) {
          const mainImg = colorGroup.images.find(img => img.isMain);
          image = mainImg?.url || colorGroup.images[0].url;
        }
      }

      items.push({
        product: product._id,
        variant: cartItem.variationId,
        name: product.name,
        sku: variationDetails.sku || product.sku,
        price,
        quantity: cartItem.quantity,
        total: itemTotal,
        image,
        color: variationDetails.color || null,
        attributes: variationDetails.attributes || [],
        productDetails: {
          category: product.category,
          attributes: product.attributes || []
        }
      });
    }

    let shipping = 0;
    switch (shippingMethod) {
      case 'express': shipping = 199; break;
      case 'priority': shipping = 299; break;
      default: shipping = 99;
    }

    // const tax = Math.round(subtotal * 0.18);
    let total = subtotal + shipping;
    
    let appliedCoupon = null;
    let finalDiscountAmount = 0;
    
    if (couponCode && discountAmount) {
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
      
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired coupon'
        });
      }
      
      const userUsedCoupon = coupon.usedBy.some(entry => 
        entry.userId?.toString() === userId.toString()
      );
      
      if (userUsedCoupon) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this coupon'
        });
      }
      
      if (subtotal < coupon.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`
        });
      }
      
      let calculatedDiscount = 0;
      if (coupon.discountType === 'percentage') {
        calculatedDiscount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
          calculatedDiscount = coupon.maxDiscountAmount;
        }
      } else {
        calculatedDiscount = coupon.discountValue;
      }
      
      if (Math.abs(calculatedDiscount - discountAmount) > 1) {
        return res.status(400).json({
          success: false,
          message: 'Discount amount mismatch'
        });
      }
      
      finalDiscountAmount = calculatedDiscount;
      appliedCoupon = coupon;
      total = total - finalDiscountAmount;
    }

    // Create temporary order
    const tempOrder = await Order.create({
      orderId: `TEMP-${Date.now()}`,
      customer: userId,
      items,
      shippingAddress: formattedShippingAddress,
      shippingMethod,
      subtotal,
      shipping,
      // tax,
      total,
      couponCode: appliedCoupon?.code || null,
      discountAmount: finalDiscountAmount,
      discountType: appliedCoupon?.discountType || null,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      status: 'pending',
      currency: 'INR',
      createdBy: userId,
      isTemporary: true
    });

    // Get Razorpay settings for key_id
    const settings = await RazorpaySettings.findOne().sort({ createdAt: -1 });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `receipt_${tempOrder._id}`,
      notes: {
        orderId: tempOrder._id.toString(),
        userId: userId.toString(),
        cartId: cart._id.toString(),
        couponCode: appliedCoupon?.code || '',
        discountAmount: finalDiscountAmount.toString()
      },
      payment_capture: 1
    });

    res.status(200).json({
      success: true,
      message: finalDiscountAmount > 0 
        ? `Order created! You saved ₹${finalDiscountAmount}`
        : 'Order created successfully',
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: tempOrder._id,
        key: settings.keyId, // Dynamic key from DB
        name: process.env.STORE_NAME || "Your Store",
        description: "Order Payment",
        couponApplied: appliedCoupon ? {
          code: appliedCoupon.code,
          discount: finalDiscountAmount
        } : null,
        prefill: {
          name: formattedShippingAddress.fullName,
          email: formattedShippingAddress.email,
          contact: formattedShippingAddress.phone
        },
        theme: { color: "#3B82F6" }
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
};

// ==================== VERIFY PAYMENT ====================
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      shippingAddress
    } = req.body;

    const userId = req.user.id;

    // Get razorpay instance with dynamic keys
    const settings = await RazorpaySettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay not configured'
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", settings.keySecret) // Use dynamic secret
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get temporary order
    const tempOrder = await Order.findById(orderId);
    if (!tempOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Format shipping address
    const formattedShippingAddress = {
      fullName: shippingAddress?.fullName || tempOrder.shippingAddress?.fullName || '',
      phone: shippingAddress?.phone || tempOrder.shippingAddress?.phone || '',
      email: shippingAddress?.email || tempOrder.shippingAddress?.email || '',
      address: shippingAddress?.address || shippingAddress?.street || tempOrder.shippingAddress?.address || '',
      city: shippingAddress?.city || tempOrder.shippingAddress?.city || '',
      state: shippingAddress?.state || tempOrder.shippingAddress?.state || '',
      country: shippingAddress?.country || tempOrder.shippingAddress?.country || 'India',
      pincode: shippingAddress?.pincode || shippingAddress?.zipCode || tempOrder.shippingAddress?.pincode || '',
      landmark: shippingAddress?.landmark || tempOrder.shippingAddress?.landmark || ''
    };

    // Generate final order ID
    const year = new Date().getFullYear();
    const count = await Order.countDocuments({ isTemporary: false });
    const finalOrderId = `ORD-${year}${String(count + 1).padStart(6, '0')}`;

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        orderId: finalOrderId,
        shippingAddress: formattedShippingAddress,
        billingAddress: formattedShippingAddress,
        paymentStatus: 'paid',
        paymentDetails: {
          transactionId: razorpay_payment_id,
          paymentGateway: 'razorpay',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          receiptUrl: `https://dashboard.razorpay.com/app/orders/${razorpay_order_id}`
        },
        status: 'confirmed',
        isTemporary: false,
        paidAt: new Date(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      { new: true }
    );

    // Clear cart items
    for (const item of updatedOrder.items) {
      await Cart.findOneAndUpdate(
        { userId },
        { 
          $pull: { 
            items: { 
              productId: item.product,
              variationId: item.variant
            }
          }
        }
      );
    }

    // Update stock
    const stockUpdates = [];
    for (const item of updatedOrder.items) {
      const product = await Product.findById(item.product);
      if (product && item.variant) {
        const variationIndex = product.variations.findIndex(v => 
          v._id.toString() === item.variant.toString()
        );
        
        if (variationIndex !== -1) {
          stockUpdates.push(
            Product.findByIdAndUpdate(item.product, {
              $inc: { [`variations.${variationIndex}.stock`]: -item.quantity }
            })
          );
        }
      }
    }
    await Promise.all(stockUpdates);

    // Update coupon usage
    if (updatedOrder.couponCode && updatedOrder.discountAmount > 0) {
      const coupon = await Coupon.findOne({ code: updatedOrder.couponCode });
      if (coupon) {
        const existingEntry = coupon.usedBy.find(entry => 
          entry.userId?.toString() === userId.toString()
        );
        
        if (!existingEntry) {
          coupon.usedCount += 1;
          coupon.usedBy.push({
            userId,
            orderId: updatedOrder._id,
            usedAt: new Date(),
            orderAmount: updatedOrder.subtotal,
            discountApplied: updatedOrder.discountAmount
          });
          await coupon.save();
        }
      }
    }

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $push: { orders: updatedOrder._id },
      $inc: { totalOrders: 1, totalSpent: updatedOrder.total },
      lastOrderAt: new Date()
    });

    // Send email notification
    const user = await User.findById(userId);
    await emailService.sendOrderConfirmation(updatedOrder, user);

    res.status(200).json({
      success: true,
      message: updatedOrder.discountAmount > 0 
        ? `Payment successful! You saved ₹${updatedOrder.discountAmount}`
        : 'Payment successful! Order placed',
      data: {
        orderId: finalOrderId,
        paymentId: razorpay_payment_id,
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

// ==================== CREATE SHIPMENT ====================
exports.createShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).populate('customer');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create shipment in Shiprocket
    const shipmentData = await shiprocketService.createShipment(order);

    console.log('Shipment created:', shipmentData);
    
    // Generate label
    let labelData = null;
    if (shipmentData.shipment_id) {
      labelData = await shiprocketService.generateLabel(shipmentData.shipment_id);
    }

    // Update order with tracking info
    order.trackingNumber = shipmentData.awb_code;
    order.shippingProvider = 'Shiprocket';
    order.status = 'shipped';
    order.shipmentId = shipmentData.shipment_id;
    order.notes.push({
      note: `Shipment created: AWB ${shipmentData.awb_code}`,
      createdBy: req.user.id
    });
    await order.save();

    // Send shipment email
    await emailService.sendShipmentEmail(order, shipmentData);

    res.status(200).json({
      success: true,
      message: 'Shipment created successfully',
      data: {
        shipment: shipmentData,
        label: labelData,
        trackingNumber: shipmentData.awb_code
      }
    });

  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create shipment'
    });
  }
};

// ==================== TRACK SHIPMENT ====================
exports.trackShipment = async (req, res) => {
  try {
    const { awb } = req.params;
    
    const trackingData = await shiprocketService.trackShipment(awb);

    res.status(200).json({
      success: true,
      data: trackingData
    });

  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track shipment'
    });
  }
};

// ==================== CANCEL SHIPMENT ====================
exports.cancelShipment = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    const result = await shiprocketService.cancelShipment(shipmentId);

    res.status(200).json({
      success: true,
      message: 'Shipment cancelled successfully',
      data: result
    });

  } catch (error) {
    console.error('Error cancelling shipment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel shipment'
    });
  }
};


// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// CREATE COD ORDER WITH COUPON
// exports.createCODOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { shippingAddress, shippingMethod = 'standard', couponCode, discountAmount } = req.body;

//     // Get user cart with product details
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       model: 'Product',
//       select: 'name price images variations colorImages category attributes stock sku comparePrice'
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cart is empty'
//       });
//     }

//     // Format shipping address
//     const formattedShippingAddress = {
//       fullName: shippingAddress?.fullName || '',
//       phone: shippingAddress?.phone || '',
//       email: shippingAddress?.email || '',
//       address: shippingAddress?.street || shippingAddress?.address || '',
//       city: shippingAddress?.city || '',
//       state: shippingAddress?.state || '',
//       country: shippingAddress?.country || 'India',
//       pincode: shippingAddress?.pincode || shippingAddress?.zipCode || '',
//       landmark: shippingAddress?.landmark || ''
//     };

//     // Validate required address fields
//     const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
//     const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields: ${missingFields.join(', ')}`
//       });
//     }

//     // Calculate total amount and prepare items
//     let subtotal = 0;
//     const items = [];

//     // पहले सारे items के लिए stock check करो
//     for (const cartItem of cart.items) {
//       const product = cartItem.productId;
//       if (!product) {
//         continue;
//       }

//       // Find the specific variation from product's variations array
//       let variation = null;
//       let variationDetails = {};
      
//       if (cartItem.variationId && product.variations && product.variations.length > 0) {
//         variation = product.variations.find(v => 
//           v._id.toString() === cartItem.variationId.toString()
//         );
        
//         if (variation) {
//           variationDetails = {
//             color: variation.color,
//             attributes: variation.attributes || [],
//             sku: variation.sku || product.sku,
//             price: variation.price,
//             comparePrice: variation.comparePrice,
//             stock: variation.stock
//           };
//         }
//       }

//       // Get price from variation or product
//       const price = variation?.price || product.price || 0;
      
//       // ✅ FIX: Variation का stock check करो, product का नहीं
//       const availableStock = variation?.stock;
      
//       // अगर variation नहीं मिला तो error
//       if (!variation) {
//         return res.status(400).json({
//           success: false,
//           message: `Variation not found for ${product.name}`
//         });
//       }
      
//       // Stock check
//       if (availableStock < cartItem.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.name} (${variation.color || 'variation'}). Available: ${availableStock}, Requested: ${cartItem.quantity}`
//         });
//       }

//       const itemTotal = price * cartItem.quantity;
//       subtotal += itemTotal;

//       // Get image for this variation
//       let image = product.images?.[0]?.url || null;
      
//       // Try to get color-specific image
//       if (variation?.color && product.colorImages) {
//         const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
//         if (colorGroup && colorGroup.images && colorGroup.images.length > 0) {
//           const mainImg = colorGroup.images.find(img => img.isMain);
//           image = mainImg?.url || colorGroup.images[0].url;
//         }
//       }

//       // Get product attributes
//       const productAttributes = [];
//       if (product.attributes && product.attributes.length > 0) {
//         product.attributes.forEach(attr => {
//           if (attr.name && attr.value) {
//             productAttributes.push({
//               name: attr.name,
//               value: attr.value,
//               unit: attr.unit || ''
//             });
//           }
//         });
//       }

//       items.push({
//         product: product._id,
//         variant: cartItem.variationId,  // ये important है - variant field में variationId save करो
//         name: product.name,
//         sku: variationDetails.sku || product.sku,
//         price: price,
//         quantity: cartItem.quantity,
//         total: itemTotal,
//         image: image,
//         color: variationDetails.color || null,
//         attributes: variationDetails.attributes || [],
//         productDetails: {
//           category: product.category,
//           brand: product.brand,
//           attributes: productAttributes
//         }
//       });
//     }

//     // Calculate shipping based on method
//     let shipping = 0;
//     switch (shippingMethod) {
//       case 'express':
//         shipping = 199;
//         break;
//       case 'priority':
//         shipping = 299;
//         break;
//       default:
//         shipping = 99; // standard
//     }

//     // Calculate tax (18% GST)
//     const tax = Math.round(subtotal * 0.18);
    
//     // Calculate total before coupon
//     let total = subtotal + shipping + tax;
    
//     // 🎯 APPLY COUPON DISCOUNT
//     let appliedCoupon = null;
//     let finalDiscountAmount = 0;
    
//     if (couponCode && discountAmount) {
//       // Validate coupon again (backend validation)
//       const coupon = await Coupon.findOne({ 
//         code: couponCode.toUpperCase(),
//         isActive: true,
//         startDate: { $lte: new Date() },
//         endDate: { $gte: new Date() }
//       });
      
//       if (!coupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid or expired coupon'
//         });
//       }
      
//       // Check if user has already used this coupon
//       const userUsedCoupon = coupon.usedBy.some(entry => 
//         entry.userId && entry.userId.toString() === userId.toString()
//       );
      
//       if (userUsedCoupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'You have already used this coupon'
//         });
//       }
      
//       // Check usage limit
//       if (coupon.usedCount >= coupon.userLimit) {
//         return res.status(400).json({
//           success: false,
//           message: 'Coupon usage limit reached'
//         });
//       }
      
//       // Check minimum order amount
//       if (subtotal < coupon.minOrderAmount) {
//         return res.status(400).json({
//           success: false,
//           message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`
//         });
//       }
      
//       // Calculate discount
//       let calculatedDiscount = 0;
//       if (coupon.discountType === 'percentage') {
//         calculatedDiscount = (subtotal * coupon.discountValue) / 100;
//         if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
//           calculatedDiscount = coupon.maxDiscountAmount;
//         }
//       } else if (coupon.discountType === 'fixed') {
//         calculatedDiscount = coupon.discountValue;
//       }
      
//       // Verify that calculated discount matches sent discount
//       if (Math.abs(calculatedDiscount - discountAmount) > 1) {
//         return res.status(400).json({
//           success: false,
//           message: 'Discount amount mismatch'
//         });
//       }
      
//       finalDiscountAmount = calculatedDiscount;
//       appliedCoupon = coupon;
      
//       // Apply discount to total
//       total = total - finalDiscountAmount;
//     }
    
//     // Check minimum order amount for COD
//     if (total < 10) {
//       return res.status(400).json({
//         success: false,
//         message: 'Minimum order amount for COD is ₹10'
//       });
//     }

//     // Generate order ID
//     const year = new Date().getFullYear();
//     const count = await Order.countDocuments({ isTemporary: false });
//     const orderId = `ORD-${year}${String(count + 1).padStart(6, '0')}`;

//     // Create COD order
//     const order = await Order.create({
//       orderId,
//       customer: userId,
//       items,
//       shippingAddress: formattedShippingAddress,
//       billingAddress: formattedShippingAddress,
//       shippingMethod,
//       subtotal,
//       shipping,
//       tax,
//       total,
//       // 🎯 Add coupon details
//       couponCode: appliedCoupon ? appliedCoupon.code : null,
//       discountAmount: finalDiscountAmount,
//       discountType: appliedCoupon?.discountType || null,
//       paymentMethod: 'cash_on_delivery',
//       paymentStatus: 'pending',
//       status: 'confirmed', // COD orders are confirmed immediately
//       currency: 'INR',
//       createdBy: userId,
//       estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
//       notes: [{
//         note: finalDiscountAmount > 0 
//           ? `COD order created with coupon ${appliedCoupon?.code}. Discount: ₹${finalDiscountAmount}. Payment pending at delivery.`
//           : 'COD order created. Payment pending at delivery.',
//         createdAt: new Date()
//       }]
//     });

//     // ✅ FIX: Clear specific cart items (remove only ordered items)
//     // पहले cart से उन items को हटाओ जो order किए गए हैं
//     const orderedItemIds = cart.items.map(item => ({
//       productId: item.productId,
//       variationId: item.variationId
//     }));

//     // Cart से specific items remove करो
//     await Cart.findOneAndUpdate(
//       { userId },
//       { 
//         $pull: { 
//           items: { 
//             $or: orderedItemIds.map(id => ({
//               productId: id.productId,
//               variationId: id.variationId
//             }))
//           } 
//         }
//       }
//     );

//     // ✅ FIX: Update variation stock (एक-एक करके)
//     const stockUpdatePromises = [];
//     for (const item of order.items) {
//       const product = await Product.findById(item.product);
//       if (product && item.variant) {
//         // Variation stock update
//         const variationIndex = product.variations.findIndex(v => 
//           v._id.toString() === item.variant.toString()
//         );
        
//         if (variationIndex !== -1) {
//           const updateField = `variations.${variationIndex}.stock`;
//           stockUpdatePromises.push(
//             Product.findByIdAndUpdate(item.product, {
//               $inc: { [updateField]: -item.quantity }
//             })
//           );
//         }
//       }
//     }

//     // Execute all stock updates
//     await Promise.all(stockUpdatePromises);

//     // 🎯 UPDATE COUPON USAGE
//     if (appliedCoupon) {
//       appliedCoupon.usedCount += 1;
//       appliedCoupon.usedBy.push({
//         userId: userId,
//         orderId: order._id,
//         usedAt: new Date(),
//         orderAmount: subtotal,
//         discountApplied: finalDiscountAmount
//       });
//       await appliedCoupon.save();
//     }

//     // Update user's order history
//     await User.findByIdAndUpdate(userId, {
//       $push: { orders: order._id },
//       $inc: { totalOrders: 1, totalSpent: order.total },
//       lastOrderAt: new Date()
//     });

//     // Get user details for response
//     const user = await User.findById(userId).select('name email phone');

//     // Prepare order summary
//     const orderSummary = {
//       orderId: order.orderId,
//       items: order.items.map(item => ({
//         name: item.name,
//         quantity: item.quantity,
//         price: item.price,
//         total: item.total
//       })),
//       subtotal: order.subtotal,
//       shipping: order.shipping,
//       tax: order.tax,
//       // 🎯 Add coupon details in response
//       couponCode: order.couponCode,
//       discountAmount: order.discountAmount,
//       total: order.total,
//       orderDate: order.createdAt,
//       estimatedDelivery: order.estimatedDelivery,
//       shippingAddress: order.shippingAddress,
//       paymentMethod: 'Cash on Delivery',
//       paymentStatus: 'Pending at Delivery',
//       status: 'Confirmed'
//     };

//     res.status(201).json({
//       success: true,
//       message: finalDiscountAmount > 0 
//         ? `COD order created successfully with coupon ${appliedCoupon?.code}! You saved ₹${finalDiscountAmount}`
//         : 'COD order created successfully',
//       data: {
//         order: orderSummary,
//         orderDetails: {
//           orderId: order.orderId,
//           status: 'confirmed',
//           estimatedDelivery: order.estimatedDelivery,
//           itemsCount: order.items.length,
//           // 🎯 Add coupon info in order details
//           couponApplied: appliedCoupon ? {
//             code: appliedCoupon.code,
//             discount: finalDiscountAmount
//           } : null,
//           codInstructions: 'Please keep exact change ready for delivery'
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Error creating COD order:', error);
    
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to create COD order'
//     });
//   }
// };

// CREATE RAZORPAY ORDER WITH COUPON
// exports.createRazorpayOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { shippingAddress, shippingMethod = 'standard', couponCode, discountAmount } = req.body;

//     // Get user cart with product details
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       model: 'Product',
//       select: 'name price images variations colorImages category attributes stock sku comparePrice'
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cart is empty'
//       });
//     }

//     // Format shipping address to match schema
//     const formattedShippingAddress = {
//       fullName: shippingAddress?.fullName || '',
//       phone: shippingAddress?.phone || '',
//       email: shippingAddress?.email || '',
//       address: shippingAddress?.street || shippingAddress?.address || '',
//       city: shippingAddress?.city || '',
//       state: shippingAddress?.state || '',
//       country: shippingAddress?.country || 'India',
//       pincode: shippingAddress?.pincode || shippingAddress?.zipCode || '',
//       landmark: shippingAddress?.landmark || ''
//     };

//     // Validate required address fields
//     const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
//     const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields: ${missingFields.join(', ')}`
//       });
//     }

//     // Calculate total amount and prepare items
//     let subtotal = 0;
//     const items = [];

//     // पहले सारे items के लिए stock check करो
//     for (const cartItem of cart.items) {
//       const product = cartItem.productId;
//       if (!product) {
//         continue;
//       }

//       // Find the specific variation from product's variations array
//       let variation = null;
//       let variationDetails = {};
      
//       if (cartItem.variationId && product.variations && product.variations.length > 0) {
//         variation = product.variations.find(v => 
//           v._id.toString() === cartItem.variationId.toString()
//         );
        
//         if (variation) {
//           variationDetails = {
//             color: variation.color,
//             attributes: variation.attributes || [],
//             sku: variation.sku || product.sku,
//             price: variation.price,
//             comparePrice: variation.comparePrice,
//             stock: variation.stock
//           };
//         }
//       }

//       // Get price from variation or product
//       const price = variation?.price || product.price || 0;
      
//       // ✅ FIX: Variation का stock check करो, product का नहीं
//       const availableStock = variation?.stock;
      
//       // अगर variation नहीं मिला तो error
//       if (!variation) {
//         return res.status(400).json({
//           success: false,
//           message: `Variation not found for ${product.name}`
//         });
//       }
      
//       // Stock check
//       if (availableStock < cartItem.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.name} (${variation.color || 'variation'}). Available: ${availableStock}, Requested: ${cartItem.quantity}`
//         });
//       }

//       const itemTotal = price * cartItem.quantity;
//       subtotal += itemTotal;

//       // Get image for this variation
//       let image = product.images?.[0]?.url || null;
      
//       // Try to get color-specific image
//       if (variation?.color && product.colorImages) {
//         const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
//         if (colorGroup && colorGroup.images && colorGroup.images.length > 0) {
//           const mainImg = colorGroup.images.find(img => img.isMain);
//           image = mainImg?.url || colorGroup.images[0].url;
//         }
//       }

//       // Get product attributes
//       const productAttributes = [];
//       if (product.attributes && product.attributes.length > 0) {
//         product.attributes.forEach(attr => {
//           if (attr.name && attr.value) {
//             productAttributes.push({
//               name: attr.name,
//               value: attr.value,
//               unit: attr.unit || ''
//             });
//           }
//         });
//       }

//       items.push({
//         product: product._id,
//         variant: cartItem.variationId,  // ये important है - variant field में variationId save करो
//         name: product.name,
//         sku: variationDetails.sku || product.sku,
//         price: price,
//         quantity: cartItem.quantity,
//         total: itemTotal,
//         image: image,
//         color: variationDetails.color || null,
//         attributes: variationDetails.attributes || [],
//         productDetails: {
//           category: product.category,
//           brand: product.brand,
//           attributes: productAttributes
//         }
//       });
//     }

//     // Calculate shipping based on method
//     let shipping = 0;
//     switch (shippingMethod) {
//       case 'express':
//         shipping = 199;
//         break;
//       case 'priority':
//         shipping = 299;
//         break;
//       default:
//         shipping = 99; // standard
//     }

//     // Calculate tax (18% GST)
//     const tax = Math.round(subtotal * 0.18);
    
//     // Calculate total before coupon
//     let total = subtotal + shipping + tax;
    
//     // 🎯 APPLY COUPON DISCOUNT
//     let appliedCoupon = null;
//     let finalDiscountAmount = 0;
    
//     if (couponCode && discountAmount) {
//       // Validate coupon again (backend validation)
//       const coupon = await Coupon.findOne({ 
//         code: couponCode.toUpperCase(),
//         isActive: true,
//         startDate: { $lte: new Date() },
//         endDate: { $gte: new Date() }
//       });
      
//       if (!coupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid or expired coupon'
//         });
//       }
      
//       // Check if user has already used this coupon
//       const userUsedCoupon = coupon.usedBy.some(entry => 
//         entry.userId && entry.userId.toString() === userId.toString()
//       );
      
//       if (userUsedCoupon) {
//         return res.status(400).json({
//           success: false,
//           message: 'You have already used this coupon'
//         });
//       }
      
//       // Check usage limit
//       if (coupon.usedCount >= coupon.userLimit) {
//         return res.status(400).json({
//           success: false,
//           message: 'Coupon usage limit reached'
//         });
//       }
      
//       // Check minimum order amount
//       if (subtotal < coupon.minOrderAmount) {
//         return res.status(400).json({
//           success: false,
//           message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`
//         });
//       }
      
//       // Calculate discount
//       let calculatedDiscount = 0;
//       if (coupon.discountType === 'percentage') {
//         calculatedDiscount = (subtotal * coupon.discountValue) / 100;
//         if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
//           calculatedDiscount = coupon.maxDiscountAmount;
//         }
//       } else if (coupon.discountType === 'fixed') {
//         calculatedDiscount = coupon.discountValue;
//       }
      
//       // Verify that calculated discount matches sent discount
//       if (Math.abs(calculatedDiscount - discountAmount) > 1) {
//         return res.status(400).json({
//           success: false,
//           message: 'Discount amount mismatch'
//         });
//       }
      
//       finalDiscountAmount = calculatedDiscount;
//       appliedCoupon = coupon;
      
//       // Apply discount to total
//       total = total - finalDiscountAmount;
//     }
    
//     // Check minimum order amount
//     if (total < 10) {
//       return res.status(400).json({
//         success: false,
//         message: 'Minimum order amount is ₹10'
//       });
//     }

//     // Create temporary order document for reference
//     const tempOrder = await Order.create({
//       orderId: `TEMP-${Date.now()}`,
//       customer: userId,
//       items,
//       shippingAddress: formattedShippingAddress,
//       shippingMethod,
//       subtotal,
//       shipping,
//       tax,
//       total,
//       // 🎯 Add coupon details
//       couponCode: appliedCoupon ? appliedCoupon.code : null,
//       discountAmount: finalDiscountAmount,
//       discountType: appliedCoupon?.discountType || null,
//       paymentMethod: 'razorpay',
//       paymentStatus: 'pending',
//       status: 'pending',
//       currency: 'INR',
//       createdBy: userId,
//       isTemporary: true
//     });

//     // Create Razorpay order
//     const razorpayOrder = await razorpay.orders.create({
//       amount: Math.round(total * 100), // Convert to paise
//       currency: 'INR',
//       receipt: `receipt_${tempOrder._id}`,
//       notes: {
//         orderId: tempOrder._id.toString(),
//         userId: userId.toString(),
//         cartId: cart._id.toString(),
//         // 🎯 Add coupon info in notes
//         couponCode: appliedCoupon?.code || '',
//         discountAmount: finalDiscountAmount.toString()
//       },
//       payment_capture: 1
//     });

//     res.status(200).json({
//       success: true,
//       message: finalDiscountAmount > 0 
//         ? `Razorpay order created with coupon ${appliedCoupon?.code}! You saved ₹${finalDiscountAmount}`
//         : 'Razorpay order created successfully',
//       data: {
//         razorpayOrderId: razorpayOrder.id,
//         amount: razorpayOrder.amount,
//         currency: razorpayOrder.currency,
//         orderId: tempOrder._id,
//         tempOrderId: tempOrder.orderId,
//         key: process.env.RAZORPAY_KEY_ID,
//         name: "Your Store",
//         description: "Order Payment",
//         // 🎯 Add coupon info in response
//         couponApplied: appliedCoupon ? {
//           code: appliedCoupon.code,
//           discount: finalDiscountAmount,
//           type: appliedCoupon.discountType
//         } : null,
//         prefill: {
//           name: formattedShippingAddress.fullName,
//           email: formattedShippingAddress.email,
//           contact: formattedShippingAddress.phone
//         },
//         theme: {
//           color: "#3B82F6"
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Error creating Razorpay order:', error);
    
//     if (error.error && error.error.description) {
//       return res.status(400).json({
//         success: false,
//         message: `Razorpay error: ${error.error.description}`
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to create payment order'
//     });
//   }
// };

// VERIFY RAZORPAY PAYMENT WITH COUPON
// exports.verifyRazorpayPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       orderId,
//       shippingAddress
//     } = req.body;

//     const userId = req.user.id;

//     // Verify signature
//     const body = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_SECRET)
//       .update(body.toString())
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       const body2 = razorpay_payment_id + "|" + razorpay_order_id;
//       const expectedSignature2 = crypto
//         .createHmac("sha256", process.env.RAZORPAY_SECRET)
//         .update(body2.toString())
//         .digest("hex");
      
//       if (expectedSignature2 !== razorpay_signature) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid payment signature'
//         });
//       }
//     }

//     // Get temporary order
//     const tempOrder = await Order.findById(orderId);
//     if (!tempOrder) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found'
//       });
//     }

//     if (!tempOrder.isTemporary) {
//       return res.status(400).json({
//         success: false,
//         message: 'Order already processed'
//       });
//     }

//     // Format shipping address
//     const formattedShippingAddress = {
//       fullName: shippingAddress?.fullName || tempOrder.shippingAddress?.fullName || '',
//       phone: shippingAddress?.phone || tempOrder.shippingAddress?.phone || '',
//       email: shippingAddress?.email || tempOrder.shippingAddress?.email || '',
//       address: shippingAddress?.address || shippingAddress?.street || tempOrder.shippingAddress?.address || '',
//       city: shippingAddress?.city || tempOrder.shippingAddress?.city || '',
//       state: shippingAddress?.state || tempOrder.shippingAddress?.state || '',
//       country: shippingAddress?.country || tempOrder.shippingAddress?.country || 'India',
//       pincode: shippingAddress?.pincode || shippingAddress?.zipCode || tempOrder.shippingAddress?.pincode || '',
//       landmark: shippingAddress?.landmark || tempOrder.shippingAddress?.landmark || ''
//     };

//     // Generate final order ID
//     const year = new Date().getFullYear();
//     const count = await Order.countDocuments({ isTemporary: false });
//     const finalOrderId = `ORD-${year}${String(count + 1).padStart(6, '0')}`;

//     // Verify payment with Razorpay API
//     let payment;
//     try {
//       payment = await razorpay.payments.fetch(razorpay_payment_id);
//     } catch (razorpayError) {
//       console.error('Error fetching payment from Razorpay:', razorpayError);
//       return res.status(400).json({
//         success: false,
//         message: 'Failed to verify payment with Razorpay'
//       });
//     }

//     // Check payment status
//     if (payment.status !== 'captured' && payment.status !== 'authorized') {
//       return res.status(400).json({
//         success: false,
//         message: `Payment not successful. Status: ${payment.status}`
//       });
//     }

//     // Update order with payment details
//     const updatedOrder = await Order.findByIdAndUpdate(
//       orderId,
//       {
//         orderId: finalOrderId,
//         shippingAddress: formattedShippingAddress,
//         billingAddress: formattedShippingAddress,
//         paymentStatus: 'paid',
//         paymentDetails: {
//           transactionId: razorpay_payment_id,
//           paymentGateway: 'razorpay',
//           razorpayOrderId: razorpay_order_id,
//           razorpayPaymentId: razorpay_payment_id,
//           razorpaySignature: razorpay_signature,
//           receiptUrl: `https://dashboard.razorpay.com/app/orders/${razorpay_order_id}`,
//           paymentMethod: payment.method,
//           bank: payment.bank,
//           wallet: payment.wallet,
//           vpa: payment.vpa
//         },
//         status: 'confirmed',
//         isTemporary: false,
//         paidAt: new Date(),
//         estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//       },
//       { new: true }
//     );

//     // ✅ FIX: Clear specific cart items (remove only ordered items)
//     const cart = await Cart.findOne({ userId });
    
//     if (cart) {
//       // Get ordered items' productId and variationId
//       const orderedItems = updatedOrder.items.map(item => ({
//         productId: item.product,
//         variationId: item.variant
//       }));

//       // Cart से specific items remove करो
//       for (const orderedItem of orderedItems) {
//         await Cart.findOneAndUpdate(
//           { userId },
//           { 
//             $pull: { 
//               items: { 
//                 productId: orderedItem.productId,
//                 variationId: orderedItem.variationId
//               }
//             }
//           }
//         );
//       }
//     }

//     // ✅ FIX: Update variation stock (एक-एक करके)
//     const stockUpdatePromises = [];
//     for (const item of updatedOrder.items) {
//       const product = await Product.findById(item.product);
//       if (product && item.variant) {
//         // Variation stock update
//         const variationIndex = product.variations.findIndex(v => 
//           v._id.toString() === item.variant.toString()
//         );
        
//         if (variationIndex !== -1) {
//           const updateField = `variations.${variationIndex}.stock`;
//           stockUpdatePromises.push(
//             Product.findByIdAndUpdate(item.product, {
//               $inc: { [updateField]: -item.quantity }
//             })
//           );
//         }
        
//         // Update total sold count
//         stockUpdatePromises.push(
//           Product.findByIdAndUpdate(item.product, {
//             $inc: { sold: item.quantity }
//           })
//         );
//       }
//     }

//     // Execute all stock updates
//     await Promise.all(stockUpdatePromises);

//     // 🎯 UPDATE COUPON USAGE
//     if (updatedOrder.couponCode && updatedOrder.discountAmount > 0) {
//       const coupon = await Coupon.findOne({ code: updatedOrder.couponCode });
//       if (coupon) {
//         // Check if user already exists in usedBy
//         const existingEntry = coupon.usedBy.find(entry => 
//           entry.userId && entry.userId.toString() === userId.toString()
//         );
        
//         if (!existingEntry) {
//           coupon.usedCount += 1;
//           coupon.usedBy.push({
//             userId: userId,
//             orderId: updatedOrder._id,
//             usedAt: new Date(),
//             orderAmount: updatedOrder.subtotal,
//             discountApplied: updatedOrder.discountAmount
//           });
//           await coupon.save();
//         }
//       }
//     }

//     // Update user's order history
//     await User.findByIdAndUpdate(userId, {
//       $push: { orders: updatedOrder._id },
//       $inc: { totalOrders: 1, totalSpent: updatedOrder.total },
//       lastOrderAt: new Date()
//     });

//     // Prepare order summary for response
//     const orderSummary = {
//       orderId: updatedOrder.orderId,
//       items: updatedOrder.items.map(item => ({
//         name: item.name,
//         quantity: item.quantity,
//         price: item.price,
//         total: item.total
//       })),
//       subtotal: updatedOrder.subtotal,
//       shipping: updatedOrder.shipping,
//       tax: updatedOrder.tax,
//       // 🎯 Add coupon details in response
//       couponCode: updatedOrder.couponCode,
//       discountAmount: updatedOrder.discountAmount,
//       total: updatedOrder.total,
//       paymentId: razorpay_payment_id,
//       orderDate: updatedOrder.createdAt,
//       estimatedDelivery: updatedOrder.estimatedDelivery,
//       shippingAddress: updatedOrder.shippingAddress
//     };

//     res.status(200).json({
//       success: true,
//       message: updatedOrder.discountAmount > 0 
//         ? `Payment verified! Order placed successfully with coupon ${updatedOrder.couponCode}. You saved ₹${updatedOrder.discountAmount}`
//         : 'Payment verified and order created successfully',
//       data: {
//         order: orderSummary,
//         payment: {
//           id: razorpay_payment_id,
//           status: 'captured',
//           amount: updatedOrder.total,
//           currency: 'INR',
//           method: payment.method,
//           bank: payment.bank,
//           wallet: payment.wallet
//         },
//         orderDetails: {
//           orderId: finalOrderId,
//           status: 'confirmed',
//           estimatedDelivery: updatedOrder.estimatedDelivery,
//           trackingNumber: null,
//           itemsCount: updatedOrder.items.length,
//           // 🎯 Add coupon info in order details
//           couponApplied: updatedOrder.couponCode ? {
//             code: updatedOrder.couponCode,
//             discount: updatedOrder.discountAmount
//           } : null
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Error verifying payment:', error);
    
//     if (error.error && error.error.description) {
//       return res.status(400).json({
//         success: false,
//         message: `Razorpay error: ${error.error.description}`
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to verify payment'
//     });
//   }
// };

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      _id: orderId,
      customer: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Initiate refund if payment was made
    if (order.paymentStatus === 'paid') {
      try {
        // Create Razorpay refund
        const refund = await razorpay.payments.refund(
          order.paymentDetails.razorpayPaymentId,
          {
            amount: Math.round(order.total * 100),
            speed: 'normal',
            notes: {
              reason: 'Order cancelled by customer'
            }
          }
        );

        order.paymentStatus = 'refunded';
        order.refund = {
          amount: order.total,
          status: 'processed',
          processedAt: new Date(),
          razorpayRefundId: refund.id
        };
      } catch (refundError) {
        console.error('Refund error:', refundError);
        // Continue with cancellation even if refund fails
      }
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        // Restore variation stock
        if (item.variation && product.variations) {
          const variationIndex = product.variations.findIndex(v => 
            v._id.toString() === item.variation.toString()
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
          // Restore main product stock
          await Product.findByIdAndUpdate(item.product, {
            $inc: { 
              stock: item.quantity,
              sold: -item.quantity 
            }
          });
        }
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
};

// exports.getMyOrders = async (req, res, next) => {
//   try {
//     const features = new APIFeatures(Order.find({ customer: req.user._id }), req.query)
//     const orders = await features.query
//     res.status(200).json(orders);
//   } catch (error) {
//     next(error);
//   }
// };
exports.getMyOrders = async (req, res, next) => {
  try {
    const features = new APIFeatures(
      Order.find({ customer: req.user._id })
        .populate({
          path: 'items.product',
          select: 'name sku slug description shortDescription colorImages variations',
          populate: {
            path: 'variations'
          }
        })
        .populate('customer', 'name email phone avatar')
        .populate('createdBy', 'name email'),
      req.query
    );
    
    const orders = await features.query;

    // Process each order to add image URLs
    const processedOrders = orders.map(order => {
      const orderObj = order.toObject();
      
      // Process each item in the order
      orderObj.items = orderObj.items.map(item => {
        const product = item.product;
        let itemImage = null;
        let itemColor = null;
        let variationDetails = null;

        if (product && product.variations && product.variations.length > 0) {
          // Find variation by ID
          variationDetails = product.variations.find(v => 
            v._id.toString() === item.variant?.toString()
          );

          // If not found, try by SKU
          if (!variationDetails && item.sku) {
            variationDetails = product.variations.find(v => 
              v.sku === item.sku
            );
          }

          if (variationDetails) {
            // Get color from variation
            const colorAttr = variationDetails.attributes?.find(attr => 
              attr.name && attr.name.toLowerCase() === 'color'
            );
            itemColor = colorAttr ? colorAttr.value : variationDetails.color;

            // Get image from product.colorImages
            if (itemColor && product.colorImages && product.colorImages.length > 0) {
              const colorGroup = product.colorImages.find(ci => {
                const groupColor = ci.color || ci._doc?.color;
                return groupColor === itemColor;
              });

              if (colorGroup && colorGroup.images && colorGroup.images.length > 0) {
                const mainImage = colorGroup.images.find(img => img.isMain === true);
                itemImage = mainImage || colorGroup.images[0];
              }
            }
          }
        }

        // If still no image, try to get any image from product
        if (!itemImage && product && product.colorImages) {
          const firstColorGroup = product.colorImages[0];
          if (firstColorGroup && firstColorGroup.images && firstColorGroup.images.length > 0) {
            const mainImage = firstColorGroup.images.find(img => img.isMain === true);
            itemImage = mainImage || firstColorGroup.images[0];
          }
        }

        // Return enhanced item
        return {
          ...item,
          image: itemImage ? {
            url: itemImage.url,
            public_id: itemImage.public_id,
            isMain: itemImage.isMain
          } : null,
          color: itemColor,
          variationDetails: variationDetails ? {
            _id: variationDetails._id,
            sku: variationDetails.sku,
            price: variationDetails.price,
            comparePrice: variationDetails.comparePrice,
            attributes: variationDetails.attributes,
            color: itemColor
          } : null,
          _debug: {
            variationFound: !!variationDetails,
            colorFound: !!itemColor,
            imageFound: !!itemImage,
            colorImagesCount: product?.colorImages?.length || 0,
            variationsCount: product?.variations?.length || 0
          }
        };
      });

      return orderObj;
    });

    res.status(200).json(processedOrders);
  } catch (error) {
    console.error('Error in getMyOrders:', error);
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    
    // First, check if orders exist in database without any filters
    const totalOrdersInDB = await Order.countDocuments();

    // Create a base query
    let query = Order.find();
    
    // Apply filters manually for debugging
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'status', 'paymentStatus', 'dateRange'];
    excludedFields.forEach(field => delete queryObj[field]);
    
    // Apply status filter if provided and not 'all'
    if (req.query.status && req.query.status !== 'all') {
      query = query.where('status').equals(req.query.status);
    }
    
    // Apply payment status filter if provided and not 'all'
    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
      query = query.where('paymentStatus').equals(req.query.paymentStatus);
    }
    
    // Apply search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query = query.or([
        { orderId: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex }
      ]);
    }
    
    // Apply date range filter
    if (req.query.dateRange && req.query.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch(req.query.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        query = query.where('createdAt').gte(startDate);
      }
    }
    
    // Apply sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Count total before pagination (for pagination info)
    const filterQuery = query._conditions;
    
    const total = await Order.countDocuments(filterQuery);
    
    // Apply pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query with population
    const orders = await query
      .populate('customer', 'name email phone')
      .populate('createdBy', 'name email')
    
    // Calculate summary stats for filtered orders
    let stats = [];
    try {
      stats = await Order.aggregate([
        { $match: filterQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            averageOrder: { $avg: '$total' }
          }
        }
      ]);
    } catch (statsError) {
      console.error('Error calculating stats:', statsError);
    }
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      summary: stats[0] || { 
        totalRevenue: 0, 
        totalOrders: total, 
        averageOrder: total > 0 ? 
          orders.reduce((acc, order) => acc + order.total, 0) / total : 0 
      },
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
    
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    next(error);
  }
};

// exports.getOrderById = async (req, res, next) => {
//   try {
//     const order = await Order.findOne({ orderId: req.params.id })
//       .populate('customer')
//       .populate('createdBy', 'name email')
//       .populate('items.product', 'name sku images price');
    
//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found'
//       });
//     }
    
//     res.status(200).json({
//       success: true,
//       data: order
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate('customer')
      .populate('createdBy', 'name email')
      .populate({
        path: 'items.product',
        select: 'name sku slug description shortDescription colorImages variations',
        populate: [
          {
            path: 'variations'
          }
        ]
      });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Convert to object for manipulation
    const orderObj = order.toObject();

    // Process each item to add image and color information
    const processedItems = await Promise.all(orderObj.items.map(async (item) => {
      try {
        const product = item.product;
        const variationId = item.variant || item.variationId; // Check both possible field names
        
        console.log('Processing item:', {
          productId: product?._id,
          variationId,
          productHasVariations: !!(product?.variations?.length),
          productHasColorImages: !!(product?.colorImages?.length)
        });

        let itemImage = null;
        let itemColor = null;
        let variationDetails = null;

        // Find the specific variation
        if (product && product.variations && product.variations.length > 0) {
          // Find variation by ID
          variationDetails = product.variations.find(v => 
            v._id.toString() === variationId?.toString()
          );

          // If variation not found by ID, try to find by SKU
          if (!variationDetails && item.sku) {
            variationDetails = product.variations.find(v => 
              v.sku === item.sku
            );
          }

          console.log('Variation found:', !!variationDetails);

          if (variationDetails) {
            // Get color from variation attributes
            const colorAttr = variationDetails.attributes?.find(attr => 
              attr.name && attr.name.toLowerCase() === 'color'
            );
            
            itemColor = colorAttr ? colorAttr.value : variationDetails.color;

            console.log('Item color:', itemColor);

            // Get image from product.colorImages
            if (itemColor && product.colorImages && product.colorImages.length > 0) {
              console.log('Looking for color in colorImages:', itemColor);
              
              // Find color group
              const colorGroup = product.colorImages.find(ci => {
                // Handle both string and object color values
                const groupColor = ci.color || ci._doc?.color;
                return groupColor === itemColor;
              });

              if (colorGroup && colorGroup.images && colorGroup.images.length > 0) {
                console.log('Color group found with images:', colorGroup.images.length);
                
                // Find main image
                const mainImage = colorGroup.images.find(img => img.isMain === true);
                itemImage = mainImage || colorGroup.images[0];
                
                console.log('Image selected:', itemImage?.url);
              } else {
                console.log('No color group or images found for color:', itemColor);
              }
            }
          }
        }

        // If still no image, try to get from product directly
        if (!itemImage && product && product.colorImages) {
          // Use first color's first image
          const firstColorGroup = product.colorImages[0];
          if (firstColorGroup && firstColorGroup.images && firstColorGroup.images.length > 0) {
            itemImage = firstColorGroup.images.find(img => img.isMain === true) || firstColorGroup.images[0];
          }
        }

        // Return enhanced item
        return {
          ...item,
          image: itemImage ? {
            url: itemImage.url,
            public_id: itemImage.public_id,
            isMain: itemImage.isMain
          } : null,
          color: itemColor,
          variationDetails: variationDetails ? {
            _id: variationDetails._id,
            sku: variationDetails.sku,
            price: variationDetails.price,
            comparePrice: variationDetails.comparePrice,
            attributes: variationDetails.attributes,
            color: itemColor
          } : null,
          _debug: {
            variationFound: !!variationDetails,
            colorFound: !!itemColor,
            imageFound: !!itemImage,
            colorImagesCount: product?.colorImages?.length || 0,
            variationsCount: product?.variations?.length || 0
          }
        };
      } catch (error) {
        console.error('Error processing order item:', error);
        return {
          ...item,
          image: null,
          color: null,
          variationDetails: null,
          _debug: { error: error.message }
        };
      }
    }));

    // Create response object with processed items
    const responseData = {
      ...orderObj,
      items: processedItems
    };

    console.log('Final response items:', processedItems.map(item => ({
      productName: item.name || item.product?.name,
      imageUrl: item.image?.url,
      color: item.color,
      debug: item._debug
    })));

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error in getOrderById:', error);
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { customer: customerId, items, ...orderData } = req.body;
    
    // Check customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Validate and prepare items
    const preparedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }
      
      // Check stock if product tracks inventory
      if (product.trackInventory && product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      preparedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        image: product.images.length > 0 ? product.images[0].url : null
      });
    }
    
    // Calculate totals
    // const tax = orderData.tax || (subtotal * 0.08);
    const shipping = orderData.shipping || 0;
    const discount = orderData.discount || 0;
    const total = subtotal + shipping - discount;
    
    // Create order
    const order = await Order.create({
      ...orderData,
      customer: customerId,
      items: preparedItems,
      subtotal,
      shipping,
      // tax,
      discount,
      total,
      createdBy: req.user.id
    });
    
    // Update product stock
    for (const item of preparedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity }
      });
    }
    
    // Update customer stats
    await customer.updateStats();
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    let order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Handle status update separately
    if (req.body.status && req.body.status !== order.status) {
      order.status = req.body.status;
      
      // Update deliveredAt if status is delivered
      if (req.body.status === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      
      await order.save();
    } else {
      order = await Order.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, sold: -item.quantity }
      });
    }
    
    await order.deleteOne();
    
    // Update customer stats
    const customer = await Customer.findById(order.customer);
    if (customer) {
      await customer.updateStats();
    }
    
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Add note if provided
    if (note) {
      order.notes.push({
        note,
        createdBy: req.user.id
      });
    }
    
    order.status = status;
    
    // Update deliveredAt if status is delivered
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.addOrderNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.notes.push({
      note,
      createdBy: req.user.id
    });
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: order.notes
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Daily sales for chart
    const dailySales = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 30 }
    ]);
    
    // Top customers
    const topCustomers = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 }
    ]);
    
    // Populate customer names
    for (const customer of topCustomers) {
      const customerData = await Customer.findById(customer._id);
      if (customerData) {
        customer.customerName = `${customerData.firstName} ${customerData.lastName}`;
        customer.email = customerData.email;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          processingOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0
        },
        dailySales,
        topCustomers
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.processRefund = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order payment is not paid'
      });
    }
    
    if (amount > order.total) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed order total'
      });
    }
    
    order.refund = {
      amount,
      reason,
      status: 'processed',
      processedAt: new Date()
    };
    
    // Update payment status
    if (amount === order.total) {
      order.paymentStatus = 'refunded';
    } else {
      order.paymentStatus = 'partially_refunded';
    }
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.params.customerId })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images price');
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

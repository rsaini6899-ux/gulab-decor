const Order = require('../models/Order');
const Customer = require('../models/User');

const Product = require('../models/Product');
const APIFeatures = require('../utils/APIFeatures');

const Cart = require('../models/cart');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');


// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Create COD (Cash on Delivery) Order
exports.createCODOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, shippingMethod = 'standard' } = req.body;

    // Get user cart with product details
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

    // Validate required address fields
    const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Calculate total amount and prepare items
    let subtotal = 0;
    const items = [];

    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      if (!product) {
        continue;
      }

      // Find the specific variation from product's variations array
      let variation = null;
      let variationDetails = {};
      
      if (cartItem.variationId && product.variations && product.variations.length > 0) {
        variation = product.variations.find(v => 
          v._id.toString() === cartItem.variationId.toString()
        );
        
        if (variation) {
          variationDetails = {
            color: variation.color,
            attributes: variation.attributes || [],
            sku: variation.sku || product.sku,
            price: variation.price,
            comparePrice: variation.comparePrice,
            stock: variation.stock
          };
        }
      }

      // Get price from variation or product
      const price = variation?.price || product.price || 0;
      const comparePrice = variation?.comparePrice || product.comparePrice || 0;
      
      // Check stock availability for COD as well
      const availableStock = variation?.stock || product.stock || 0;
      if (availableStock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${cartItem.quantity}`
        });
      }

      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;

      // Get image for this variation
      let image = product.images?.[0]?.url || null;
      
      // Try to get color-specific image
      if (variation?.color && product.colorImages) {
        const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
        if (colorGroup && colorGroup.images && colorGroup.images.length > 0) {
          // Find main image or use first image
          const mainImg = colorGroup.images.find(img => img.isMain);
          image = mainImg?.url || colorGroup.images[0].url;
        }
      }

      // Get product attributes
      const productAttributes = [];
      if (product.attributes && product.attributes.length > 0) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value) {
            productAttributes.push({
              name: attr.name,
              value: attr.value,
              unit: attr.unit || ''
            });
          }
        });
      }

      items.push({
        product: product._id,
        variation: cartItem.variationId || null,
        name: product.name,
        sku: variationDetails.sku || product.sku,
        price: price,
        comparePrice: comparePrice,
        quantity: cartItem.quantity,
        total: itemTotal,
        image: image,
        color: variationDetails.color || null,
        attributes: variationDetails.attributes || [],
        productDetails: {
          category: product.category,
          brand: product.brand,
          attributes: productAttributes
        }
      });
    }

    // Calculate shipping based on method
    let shipping = 0;
    switch (shippingMethod) {
      case 'express':
        shipping = 199;
        break;
      case 'priority':
        shipping = 299;
        break;
      default:
        shipping = 99; // standard
    }

    // Calculate tax (18% GST)
    const tax = Math.round(subtotal * 0.18);
    
    // Calculate total
    const total = subtotal + shipping + tax;
    
    // Check minimum order amount for COD
    if (total < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum order amount for COD is ₹10'
      });
    }

    // Check maximum amount for COD (if any limit)
    // const maxCODAmount = 50000; // ₹50,000 limit for COD
    // if (total > maxCODAmount) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `COD not available for orders above ₹${maxCODAmount.toLocaleString()}. Please use online payment.`
    //   });
    // }

    // Generate order ID
    const year = new Date().getFullYear();
    const count = await Order.countDocuments({ isTemporary: false });
    const orderId = `ORD-${year}${String(count + 1).padStart(6, '0')}`;

    // Create COD order
    const order = await Order.create({
      orderId,
      customer: userId,
      items,
      shippingAddress: formattedShippingAddress,
      billingAddress: formattedShippingAddress,
      shippingMethod,
      subtotal,
      shipping,
      tax,
      total,
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      status: 'confirmed', // COD orders are confirmed immediately
      currency: 'INR',
      createdBy: userId,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      notes: [{
        note: 'COD order created. Payment pending at delivery.',
        createdAt: new Date()
      }]
    });

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } }
    );

    // Update product stock and variation stock (reserve stock for COD)
    const stockUpdatePromises = [];
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        // Update product total sold count
        stockUpdatePromises.push(
          Product.findByIdAndUpdate(item.product, {
            $inc: { sold: item.quantity }
          })
        );

        // Update variation stock if variation exists
        if (item.variation && product.variations) {
          const variationIndex = product.variations.findIndex(v => 
            v._id.toString() === item.variation.toString()
          );
          
          if (variationIndex !== -1) {
            const updateField = `variations.${variationIndex}.stock`;
            stockUpdatePromises.push(
              Product.findByIdAndUpdate(item.product, {
                $inc: { [updateField]: -item.quantity }
              })
            );
          }
        } else {
          // Update main product stock if no variation
          stockUpdatePromises.push(
            Product.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.quantity }
            })
          );
        }
      }
    }

    // Execute all stock updates
    await Promise.all(stockUpdatePromises);

    // Update user's order history
    await User.findByIdAndUpdate(userId, {
      $push: { orders: order._id },
      $inc: { totalOrders: 1, totalSpent: order.total, codOrders: 1 },
      lastOrderAt: new Date()
    });

    // Get user details for response
    const user = await User.findById(userId).select('name email phone');

    // Prepare order summary
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
      tax: order.tax,
      total: order.total,
      orderDate: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      shippingAddress: order.shippingAddress,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending at Delivery',
      status: 'Confirmed'
    };

    console.log('COD order created successfully:', order.orderId);

    // Send order confirmation (you can implement email/SMS)
    // await sendCODConfirmation(user.email, order);

    res.status(201).json({
      success: true,
      message: 'COD order created successfully',
      data: {
        order: orderSummary,
        orderDetails: {
          orderId: order.orderId,
          status: 'confirmed',
          estimatedDelivery: order.estimatedDelivery,
          itemsCount: order.items.length,
          codInstructions: 'Please keep exact change ready for delivery'
        }
      }
    });

  } catch (error) {
    console.error('Error creating COD order:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create COD order'
    });
  }
};

// controllers/orderController.js में
exports.createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, shippingMethod = 'standard' } = req.body;

    // Get user cart with product details
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

    // Format shipping address to match schema
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

    // Validate required address fields
    const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    const missingFields = requiredFields.filter(field => !formattedShippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Calculate total amount and prepare items
    let subtotal = 0;
    const items = [];

    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      if (!product) {
        continue;
      }

      // Find the specific variation from product's variations array
      let variation = null;
      let variationDetails = {};
      
      if (cartItem.variationId && product.variations && product.variations.length > 0) {
        variation = product.variations.find(v => 
          v._id.toString() === cartItem.variationId.toString()
        );
        
        if (variation) {
          variationDetails = {
            color: variation.color,
            attributes: variation.attributes || [],
            sku: variation.sku || product.sku,
            price: variation.price,
            comparePrice: variation.comparePrice,
            stock: variation.stock
          };
        }
      }

      // Get price from variation or product
      const price = variation?.price || product.price || 0;
      const comparePrice = variation?.comparePrice || product.comparePrice || 0;
      
      // Check stock availability
      const availableStock = variation?.stock || product.stock || 0;
      if (availableStock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${cartItem.quantity}`
        });
      }

      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;

      // Get image for this variation
      let image = product.images?.[0]?.url || null;
      
      // Try to get color-specific image
      if (variation?.color && product.colorImages) {
        const colorGroup = product.colorImages.find(ci => ci.color === variation.color);
        if (colorGroup && colorGroup.images && colorGroup.images.length > 0) {
          // Find main image or use first image
          const mainImg = colorGroup.images.find(img => img.isMain);
          image = mainImg?.url || colorGroup.images[0].url;
        }
      }

      // Get product attributes
      const productAttributes = [];
      if (product.attributes && product.attributes.length > 0) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value) {
            productAttributes.push({
              name: attr.name,
              value: attr.value,
              unit: attr.unit || ''
            });
          }
        });
      }

      items.push({
        product: product._id,
        variation: cartItem.variationId || null,
        name: product.name,
        sku: variationDetails.sku || product.sku,
        price: price,
        comparePrice: comparePrice,
        quantity: cartItem.quantity,
        total: itemTotal,
        image: image,
        color: variationDetails.color || null,
        attributes: variationDetails.attributes || [],
        productDetails: {
          category: product.category,
          brand: product.brand,
          attributes: productAttributes
        }
      });
    }

    // Calculate shipping based on method
    let shipping = 0;
    switch (shippingMethod) {
      case 'express':
        shipping = 199;
        break;
      case 'priority':
        shipping = 299;
        break;
      default:
        shipping = 99; // standard
    }

    // Calculate tax (18% GST)
    const tax = Math.round(subtotal * 0.18);
    
    // Calculate total
    const total = subtotal + shipping + tax;
    
    // Check minimum order amount
    if (total < 10) { // Minimum ₹10
      return res.status(400).json({
        success: false,
        message: 'Minimum order amount is ₹10'
      });
    }

    // Create temporary order document for reference
    const tempOrder = await Order.create({
      orderId: `TEMP-${Date.now()}`,
      customer: userId,
      items,
      shippingAddress: formattedShippingAddress,
      shippingMethod,
      subtotal,
      shipping,
      tax,
      total,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      status: 'pending',
      currency: 'INR',
      createdBy: userId,
      isTemporary: true
    });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${tempOrder._id}`,
      notes: {
        orderId: tempOrder._id.toString(),
        userId: userId.toString(),
        cartId: cart._id.toString()
      },
      payment_capture: 1 // Auto capture payment
    });

    console.log('Razorpay order created:', razorpayOrder.id);

    res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: tempOrder._id,
        tempOrderId: tempOrder.orderId,
        key: process.env.RAZORPAY_KEY_ID,
        name: "Your Store",
        description: "Order Payment",
        prefill: {
          name: formattedShippingAddress.fullName,
          email: formattedShippingAddress.email,
          contact: formattedShippingAddress.phone
        },
        theme: {
          color: "#3B82F6"
        }
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Handle specific Razorpay errors
    if (error.error && error.error.description) {
      return res.status(400).json({
        success: false,
        message: `Razorpay error: ${error.error.description}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
};

// controllers/orderController.js में
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

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    console.log('Verifying signature:', {
      razorpay_signature,
      expectedSignature,
      match: expectedSignature === razorpay_signature
    });

    if (expectedSignature !== razorpay_signature) {
      // Also try with payment_id + order_id (different order)
      const body2 = razorpay_payment_id + "|" + razorpay_order_id;
      const expectedSignature2 = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body2.toString())
        .digest("hex");
      
      if (expectedSignature2 !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
    }

    // Get temporary order
    const tempOrder = await Order.findById(orderId);
    if (!tempOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!tempOrder.isTemporary) {
      return res.status(400).json({
        success: false,
        message: 'Order already processed'
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

    // Verify payment with Razorpay API
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
      console.log('Razorpay payment details:', payment);
    } catch (razorpayError) {
      console.error('Error fetching payment from Razorpay:', razorpayError);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment with Razorpay'
      });
    }

    // Check payment status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${payment.status}`
      });
    }

    // Update order with payment details
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        orderId: finalOrderId,
        shippingAddress: formattedShippingAddress,
        billingAddress: formattedShippingAddress, // Same as shipping
        paymentStatus: 'paid',
        paymentDetails: {
          transactionId: razorpay_payment_id,
          paymentGateway: 'razorpay',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          receiptUrl: `https://dashboard.razorpay.com/app/orders/${razorpay_order_id}`,
          paymentMethod: payment.method,
          bank: payment.bank,
          wallet: payment.wallet,
          vpa: payment.vpa
        },
        status: 'confirmed',
        isTemporary: false,
        paidAt: new Date(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      { new: true }
    );

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } }
    );

    // Update product stock and variation stock
    const stockUpdatePromises = [];
    for (const item of updatedOrder.items) {
      const product = await Product.findById(item.product);
      if (product) {
        // Update product total sold count
        stockUpdatePromises.push(
          Product.findByIdAndUpdate(item.product, {
            $inc: { sold: item.quantity }
          })
        );

        // Update variation stock if variation exists
        if (item.variation && product.variations) {
          const variationIndex = product.variations.findIndex(v => 
            v._id.toString() === item.variation.toString()
          );
          
          if (variationIndex !== -1) {
            const updateField = `variations.${variationIndex}.stock`;
            stockUpdatePromises.push(
              Product.findByIdAndUpdate(item.product, {
                $inc: { [updateField]: -item.quantity }
              })
            );
          }
        } else {
          // Update main product stock if no variation
          stockUpdatePromises.push(
            Product.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.quantity }
            })
          );
        }
      }
    }

    // Execute all stock updates
    await Promise.all(stockUpdatePromises);

    // Update user's order history
    await User.findByIdAndUpdate(userId, {
      $push: { orders: updatedOrder._id },
      $inc: { totalOrders: 1, totalSpent: updatedOrder.total },
      lastOrderAt: new Date()
    });

    // Get user details for email
    const user = await User.findById(userId).select('name email');

    // Prepare order summary for response
    const orderSummary = {
      orderId: updatedOrder.orderId,
      items: updatedOrder.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      subtotal: updatedOrder.subtotal,
      shipping: updatedOrder.shipping,
      tax: updatedOrder.tax,
      total: updatedOrder.total,
      paymentId: razorpay_payment_id,
      orderDate: updatedOrder.createdAt,
      estimatedDelivery: updatedOrder.estimatedDelivery,
      shippingAddress: updatedOrder.shippingAddress
    };

    console.log('Order created successfully:', finalOrderId);

    res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      data: {
        order: orderSummary,
        payment: {
          id: razorpay_payment_id,
          status: 'captured',
          amount: updatedOrder.total,
          currency: 'INR',
          method: payment.method,
          bank: payment.bank,
          wallet: payment.wallet
        },
        orderDetails: {
          orderId: finalOrderId,
          status: 'confirmed',
          estimatedDelivery: updatedOrder.estimatedDelivery,
          trackingNumber: null, // Will be added when shipped
          itemsCount: updatedOrder.items.length
        }
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    
    // Handle specific errors
    if (error.error && error.error.description) {
      return res.status(400).json({
        success: false,
        message: `Razorpay error: ${error.error.description}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

// Cancel Order with stock restoration
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





exports.getMyOrders = async (req, res, next) => {
  try {
    const features = new APIFeatures(Order.find({ customer: req.user._id }), req.query)
    const orders = await features.query
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};


exports.getAllOrders = async (req, res, next) => {
  try {
    const features = new APIFeatures(Order.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    
    const orders = await features.query
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'name email');
    
    const total = await Order.countDocuments(features.filterQuery);
    
    // Calculate summary stats
    const stats = await Order.aggregate([
      { $match: features.filterQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrder: { $avg: '$total' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      summary: stats[0] || { totalRevenue: 0, totalOrders: 0, averageOrder: 0 },
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        pages: Math.ceil(total / (req.query.limit || 10))
      },
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
      .populate('customer')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku images price');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
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
    const tax = orderData.tax || (subtotal * 0.08); // 8% default tax
    const shipping = orderData.shipping || 0;
    const discount = orderData.discount || 0;
    const total = subtotal + shipping + tax - discount;
    
    // Create order
    const order = await Order.create({
      ...orderData,
      customer: customerId,
      items: preparedItems,
      subtotal,
      shipping,
      tax,
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
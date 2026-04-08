const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Send order confirmation email
  async sendOrderConfirmation(order, user) {
    const mailOptions = {
      from: `"${process.env.STORE_NAME || 'Your Store'}" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Order Confirmed! #${order.orderId}`,
      html: this.getOrderEmailTemplate(order, user)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${user.email}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      // Don't throw - email failure shouldn't break order process
    }
  }

  // Send shipment created email
  async sendShipmentEmail(order, trackingData) {
    if (!order.shippingAddress?.email) return;

    const mailOptions = {
      from: `"${process.env.STORE_NAME || 'Your Store'}" <${process.env.SMTP_USER}>`,
      to: order.shippingAddress.email,
      subject: `Your Order #${order.orderId} Has Been Shipped!`,
      html: this.getShipmentEmailTemplate(order, trackingData)
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Shipment email sent to ${order.shippingAddress.email}`);
    } catch (error) {
      console.error('Shipment email failed:', error);
    }
  }

  // Send order cancellation email
async sendOrderCancellationEmail(order, user) {
  const recipientEmail = user?.email || order.shippingAddress?.email;
  
  if (!recipientEmail) {
    console.error('No email found for cancellation notification');
    return;
  }

  const mailOptions = {
    from: `"${process.env.STORE_NAME || 'Your Store'}" <${process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: `Order Cancelled #${order.orderId}`,
    html: this.getCancellationEmailTemplate(order, user)
  };

  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`Cancellation email sent to ${recipientEmail}`);
  } catch (error) {
    console.error('Cancellation email failed:', error);
  }
}

// Send order status update email
async sendOrderStatusUpdateEmail(order, user, oldStatus, newStatus) {
  const recipientEmail = user?.email || order.shippingAddress?.email;
  
  if (!recipientEmail) {
    console.error('No email found for status update notification');
    return;
  }

  // Get status specific details
  const statusDetails = this.getStatusEmailDetails(newStatus, oldStatus);
  
  const mailOptions = {
    from: `"${process.env.STORE_NAME || 'Your Store'}" <${process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: `${statusDetails.emoji} Order ${statusDetails.title} #${order.orderId}`,
    html: this.getOrderStatusUpdateTemplate(order, user, oldStatus, newStatus, statusDetails)
  };

  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`Order status update email sent to ${recipientEmail}: ${oldStatus} → ${newStatus}`);
  } catch (error) {
    console.error('Status update email failed:', error);
  }
}

// Get status email details
getStatusEmailDetails(status, oldStatus) {
  const details = {
    confirmed: {
      emoji: '✅',
      title: 'Confirmed',
      message: 'Your order has been confirmed and is being prepared for shipment.',
      icon: 'check-circle',
      color: '#4caf50'
    },
    processing: {
      emoji: '⚙️',
      title: 'Being Processed',
      message: 'Your order is now being processed. We are getting your items ready.',
      icon: 'package',
      color: '#2196f3'
    },
    shipped: {
      emoji: '🚚',
      title: 'Shipped',
      message: 'Great news! Your order has been shipped and is on its way to you.',
      icon: 'truck',
      color: '#9c27b0'
    },
    delivered: {
      emoji: '🎉',
      title: 'Delivered',
      message: 'Your order has been delivered successfully. We hope you love your purchase!',
      icon: 'gift',
      color: '#4caf50'
    },
    cancelled: {
      emoji: '❌',
      title: 'Cancelled',
      message: 'Your order has been cancelled as requested.',
      icon: 'x-circle',
      color: '#f44336'
    },
    returned: {
      emoji: '🔄',
      title: 'Returned',
      message: 'Your order has been returned. Refund will be processed shortly.',
      icon: 'repeat',
      color: '#ff9800'
    }
  };
  
  return details[status] || {
    emoji: '📦',
    title: 'Updated',
    message: `Your order status has been updated to ${status}.`,
    icon: 'package',
    color: '#607d8b'
  };
}

// Order status update email template
getOrderStatusUpdateTemplate(order, user, oldStatus, newStatus, statusDetails) {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${item.image ? `<img src="${item.image}" width="50" height="50" style="border-radius: 8px; object-fit: cover;">` : ''}
          <div>
            <strong>${item.name}</strong><br>
            ${item.color ? `<span style="color: #666; font-size: 12px;">Color: ${item.color}</span><br>` : ''}
            <span style="color: #666; font-size: 12px;">Qty: ${item.quantity} × ₹${item.price}</span>
          </div>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ₹${item.total}
      </td>
    </tr>
  `).join('');

  // Timeline HTML based on status
  const getTimelineHtml = () => {
    const steps = [
      { name: 'Order Placed', status: 'completed', date: order.createdAt },
      { name: 'Confirmed', status: ['confirmed', 'processing', 'shipped', 'delivered'].includes(newStatus) ? 'completed' : (newStatus === 'cancelled' ? 'cancelled' : 'pending'), date: newStatus === 'confirmed' ? new Date() : null },
      { name: 'Processing', status: ['processing', 'shipped', 'delivered'].includes(newStatus) ? 'completed' : (newStatus === 'cancelled' ? 'cancelled' : 'pending'), date: newStatus === 'processing' ? new Date() : null },
      { name: 'Shipped', status: ['shipped', 'delivered'].includes(newStatus) ? 'completed' : (newStatus === 'cancelled' ? 'cancelled' : 'pending'), date: newStatus === 'shipped' ? new Date() : null, tracking: order.trackingNumber },
      { name: 'Delivered', status: newStatus === 'delivered' ? 'completed' : (newStatus === 'cancelled' ? 'cancelled' : 'pending'), date: newStatus === 'delivered' ? new Date() : null }
    ];

    if (newStatus === 'cancelled') {
      steps.forEach(step => {
        if (step.status !== 'completed') step.status = 'cancelled';
      });
    }

    return steps.map(step => `
      <div style="display: flex; align-items: center; margin-bottom: 20px; ${step.status === 'cancelled' ? 'opacity: 0.5;' : ''}">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${step.status === 'completed' ? '#4caf50' : (step.status === 'cancelled' ? '#f44336' : '#e0e0e0')}; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
          ${step.status === 'completed' ? '✓' : (step.status === 'cancelled' ? '✗' : '○')}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: bold; ${step.status === 'completed' ? 'color: #4caf50;' : (step.status === 'cancelled' ? 'color: #f44336;' : 'color: #666;')}">${step.name}</div>
          ${step.date ? `<div style="font-size: 12px; color: #999;">${this.formatDateForEmail(step.date)}</div>` : ''}
          ${step.tracking ? `<div style="font-size: 12px; margin-top: 5px;"><a href="https://shiprocket.co/tracking/${step.tracking}" style="color: #2196f3;">Track Shipment →</a></div>` : ''}
        </div>
      </div>
    `).join('');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${statusDetails.color} 0%, ${this.adjustColor(statusDetails.color, -20)} 100%); padding: 30px; text-align: center; border-radius: 15px 15px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Order ${statusDetails.title}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Order #${order.orderId}</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 15px 15px;">
        <p style="font-size: 16px;">Hello <strong>${user?.name || order.shippingAddress?.fullName || 'Customer'}</strong>,</p>
        
        <div style="background: ${statusDetails.color}15; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${statusDetails.color};">
          <p style="margin: 0; color: ${statusDetails.color};">
            <strong>${statusDetails.message}</strong>
          </p>
        </div>

        <!-- Order Summary -->
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📦 Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #eee;">
                <td style="padding: 12px;"><strong>Subtotal</strong></td>
                <td style="padding: 12px; text-align: right;">₹${order.subtotal}</td>
              </tr>
              <tr>
                <td style="padding: 12px;"><strong>Shipping</strong></td>
                <td style="padding: 12px; text-align: right;">₹${order.shipping}</td>
               </tr>
              <tr>
                <td style="padding: 12px;"><strong>Tax</strong></td>
                <td style="padding: 12px; text-align: right;">₹${order.tax}</td>
               </tr>
              ${order.discountAmount > 0 ? `
              <tr>
                <td style="padding: 12px;"><strong>Discount</strong></td>
                <td style="padding: 12px; text-align: right; color: green;">-₹${order.discountAmount}</td>
               </tr>
              ` : ''}
              <tr style="font-size: 18px; background: #f5f5f5;">
                <td style="padding: 12px;"><strong>Total Paid</strong></td>
                <td style="padding: 12px; text-align: right;"><strong>₹${order.total}</strong></td>
               </tr>
            </tfoot>
          </table>
        </div>

        <!-- Shipping Address -->
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📍 Shipping Address</h3>
          <p style="margin: 0;">
            <strong>${order.shippingAddress?.fullName}</strong><br>
            ${order.shippingAddress?.address}<br>
            ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}<br>
            Phone: ${order.shippingAddress?.phone}
          </p>
        </div>

        ${newStatus === 'shipped' && order.trackingNumber ? `
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://shiprocket.co/tracking/${order.trackingNumber}" style="background: ${statusDetails.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">Track Your Order →</a>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/orders/${order._id}" style="background: #607d8b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">View Order Details</a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <div style="text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 5px 0;">
            Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: ${statusDetails.color};">${process.env.SUPPORT_EMAIL || 'support@example.com'}</a>
          </p>
          <p style="color: #999; font-size: 11px; margin: 5px 0;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper: Adjust color brightness
adjustColor(color, percent) {
  // Simple color adjustment - you can implement properly if needed
  return color;
}

// Helper: Format date for email
formatDateForEmail(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Cancellation email template
getCancellationEmailTemplate(order, user) {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong><br>
        ${item.color ? `<span style="color: #666;">Color: ${item.color}</span><br>` : ''}
        Qty: ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ₹${item.total}
      </td>
    </tr>
  `).join('');

  const refundMessage = order.paymentStatus === 'refunded' 
    ? `<div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
         <p style="margin: 0; color: #2e7d32;">✅ <strong>Refund Processed</strong></p>
         <p style="margin: 5px 0 0 0; font-size: 14px;">Amount of ₹${order.refund?.amount || order.total} has been refunded to your original payment method. It may take 3-7 business days to reflect in your account.</p>
       </div>`
    : `<div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
         <p style="margin: 0; color: #e65100;">ℹ️ <strong>No payment was collected</strong></p>
         <p style="margin: 5px 0 0 0; font-size: 14px;">Since this was a Cash on Delivery order, no refund is applicable.</p>
       </div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">❌ Order Cancelled</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px;">Hello <strong>${user?.name || order.shippingAddress?.fullName || 'Customer'}</strong>,</p>
        <p>Your order <strong>#${order.orderId}</strong> has been successfully cancelled as per your request.</p>
        
        ${refundMessage}

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #f44336; margin-top: 0;">📋 Cancelled Order Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #eee;">
                <td style="padding: 10px;"><strong>Subtotal</strong></td>
                <td style="padding: 10px; text-align: right;">₹${order.subtotal}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Shipping</strong></td>
                <td style="padding: 10px; text-align: right;">₹${order.shipping}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Tax (GST)</strong></td>
                <td style="padding: 10px; text-align: right;">₹${order.tax}</td>
              </tr>
              <tr style="font-size: 18px;">
                <td style="padding: 10px;"><strong>Total</strong></td>
                <td style="padding: 10px; text-align: right;"><strong>₹${order.total}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <ul style="color: #666;">
            <li>✓ Your order has been cancelled</li>
            ${order.paymentStatus === 'refunded' ? '<li>✓ Refund has been initiated to your original payment method</li>' : ''}
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666;">Did you change your mind? You can always place a new order!</p>
          <a href="${process.env.FRONTEND_URL}/products" style="background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">Shop Again</a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="text-align: center; color: #999; font-size: 12px;">
          Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: #f44336;">${process.env.SUPPORT_EMAIL || 'support@example.com'}</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

  // Order confirmation template
  getOrderEmailTemplate(order, user) {
    const itemsList = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image || 'https://via.placeholder.com/50'}" width="50" style="border-radius: 5px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong><br>
          ${item.color ? `<span style="color: #666;">Color: ${item.color}</span>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">₹${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">₹${item.total}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 Order Confirmed!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Hello <strong>${user.name}</strong>,</p>
          <p>Thank you for your order! We're excited to let you know that your order has been confirmed and is being processed.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #667eea; margin-top: 0;">Order Details #${order.orderId}</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 10px; text-align: left;">Item</th>
                  <th style="padding: 10px; text-align: left;">Product</th>
                  <th style="padding: 10px; text-align: left;">Qty</th>
                  <th style="padding: 10px; text-align: left;">Price</th>
                  <th style="padding: 10px; text-align: left;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <div style="border-top: 2px solid #eee; padding-top: 20px;">
              <table style="width: 100%;">
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td style="text-align: right;">₹${order.subtotal}</td>
                </tr>
                <tr>
                  <td><strong>Shipping:</strong></td>
                  <td style="text-align: right;">₹${order.shipping}</td>
                </tr>
                <tr>
                  <td><strong>Tax (18% GST):</strong></td>
                  <td style="text-align: right;">₹${order.tax}</td>
                </tr>
                ${order.discountAmount > 0 ? `
                <tr>
                  <td><strong>Discount ${order.couponCode ? `(${order.couponCode})` : ''}:</strong></td>
                  <td style="text-align: right; color: green;">-₹${order.discountAmount}</td>
                </tr>
                ` : ''}
                <tr style="font-size: 20px; color: #667eea;">
                  <td><strong>Total:</strong></td>
                  <td style="text-align: right;"><strong>₹${order.total}</strong></td>
                </tr>
              </table>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">📦 Shipping Address</h3>
            <p>
              <strong>${order.shippingAddress.fullName}</strong><br>
              ${order.shippingAddress.address}<br>
              ${order.shippingAddress.landmark ? order.shippingAddress.landmark + '<br>' : ''}
              ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}<br>
              Phone: ${order.shippingAddress.phone}<br>
              Email: ${order.shippingAddress.email}
            </p>
            
            <p style="margin-top: 20px;">
              <strong>Payment Method:</strong> ${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}<br>
              <strong>Payment Status:</strong> ${order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}<br>
              <strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/orders/${order._id}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">Track Your Order</a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="text-align: center; color: #999; font-size: 12px;">
            Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: #667eea;">${process.env.SUPPORT_EMAIL || 'support@example.com'}</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // Shipment email template
  getShipmentEmailTemplate(order, trackingData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🚚 Your Order Has Shipped!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px;">Hello <strong>${order.shippingAddress.fullName}</strong>,</p>
          <p>Good news! Your order <strong>#${order.orderId}</strong> has been shipped and is on its way to you.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="color: #f5576c; margin-top: 0;">📦 Tracking Information</h2>
            
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Courier Partner:</strong> ${trackingData.courier_name || 'Shiprocket'}</p>
              <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${trackingData.awb_code || order.trackingNumber}</p>
              <p style="margin: 5px 0;"><strong>Shipment ID:</strong> ${trackingData.shipment_id || order.shipmentId}</p>
            </div>
            
            <a href="https://shiprocket.co/tracking/${trackingData.awb_code || order.trackingNumber}" style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0;">Track Your Shipment</a>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #f5576c; margin-top: 0;">📝 Order Summary</h3>
            <table style="width: 100%;">
              <tr>
                <td><strong>Order ID:</strong></td>
                <td style="text-align: right;">${order.orderId}</td>
              </tr>
              <tr>
                <td><strong>Total Amount:</strong></td>
                <td style="text-align: right;">₹${order.total}</td>
              </tr>
              <tr>
                <td><strong>Items:</strong></td>
                <td style="text-align: right;">${order.items.length}</td>
              </tr>
              <tr>
                <td><strong>Estimated Delivery:</strong></td>
                <td style="text-align: right;">${new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">Thank you for shopping with us!</p>
            <p style="color: #999; font-size: 12px;">We hope you love your purchase.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
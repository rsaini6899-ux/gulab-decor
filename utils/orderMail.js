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
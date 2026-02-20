// const nodemailer = require('nodemailer');

// // Create transporter
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: process.env.SMTP_PORT == 465,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS
//   }
// });

// // Test email configuration
// transporter.verify(function(error, success) {
//   if (error) {
//     console.error('❌ Email configuration error:', error);
//   } else {
//     console.log('✅ Email server is ready to send messages');
//   }
// });

// // Send email function
// const sendEmail = async (options) => {
//   try {
//     const mailOptions = {
//       from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//       to: options.email,
//       subject: options.subject,
//       html: options.html,
//       text: options.text
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log(`✅ Email sent: ${info.messageId}`);
//     return info;
//   } catch (error) {
//     console.error('❌ Error sending email:', error);
//     throw error;
//   }
// };

// // Email templates
// const emailTemplates = {
//   orderConfirmation: (order, customer) => ({
//     subject: `Order Confirmation - ${order.orderId}`,
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2>Thank you for your order!</h2>
//         <p>Dear ${customer.firstName},</p>
//         <p>Your order has been confirmed. Here are your order details:</p>
        
//         <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
//           <tr>
//             <td style="padding: 10px; border: 1px solid #ddd;"><strong>Order ID:</strong></td>
//             <td style="padding: 10px; border: 1px solid #ddd;">${order.orderId}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total:</strong></td>
//             <td style="padding: 10px; border: 1px solid #ddd;">$${order.total.toFixed(2)}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
//             <td style="padding: 10px; border: 1px solid #ddd;">${order.status}</td>
//           </tr>
//         </table>
        
//         <p>We'll notify you when your order ships.</p>
//         <p>Thank you for shopping with us!</p>
//       </div>
//     `
//   }),

//   shippingUpdate: (order, customer) => ({
//     subject: `Your Order Has Shipped! - ${order.orderId}`,
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2>Your order is on the way!</h2>
//         <p>Dear ${customer.firstName},</p>
//         <p>Great news! Your order has shipped.</p>
        
//         <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
//           <tr>
//             <td style="padding: 10px; border: 1px solid #ddd;"><strong>Order ID:</strong></td>
//             <td style="padding: 10px; border: 1px solid #ddd;">${order.orderId}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tracking Number:</strong></td>
//             <td style="padding: 10px; border: 1px solid #ddd;">${order.trackingNumber}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border: 1px solid #ddd;"><strong>Shipping Method:</strong></td>
//             <td style="padding: 10px; border: 1px solid #ddd;">${order.shippingMethod}</td>
//           </tr>
//         </table>
        
//         <p>You can track your package using the tracking number above.</p>
//         <p>Thank you for shopping with us!</p>
//       </div>
//     `
//   }),

//   passwordReset: (user, resetUrl) => ({
//     subject: 'Password Reset Request',
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2>Password Reset Request</h2>
//         <p>Hello ${user.name},</p>
//         <p>You requested to reset your password. Click the link below to reset it:</p>
        
//         <div style="text-align: center; margin: 30px 0;">
//           <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
//             Reset Password
//           </a>
//         </div>
        
//         <p>This link will expire in 30 minutes.</p>
//         <p>If you didn't request this, please ignore this email.</p>
//       </div>
//     `
//   })
// };

// module.exports = {
//   sendEmail,
//   emailTemplates
// };

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Test email configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Send email function
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// Email templates for auth
const authEmailTemplates = {
  welcomeEmail: (user) => ({
    subject: `Welcome to Our Platform, ${user.name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome aboard, ${user.name}! 🎉</h2>
        <p>Thank you for joining our platform. We're excited to have you!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3>Your Account Details:</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>You can now:</p>
        <ul>
          <li>Access all features</li>
          <li>Complete your profile</li>
          <li>Start using our services</li>
        </ul>
        
        <p>If you have any questions, feel free to contact our support team.</p>
        <br/>
        <p>Best regards,<br/>The Team</p>
      </div>
    `
  }),

  otpEmail: (email, otp) => ({
    subject: 'Your Login OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Login OTP</h2>
        <p>Hello,</p>
        <p>Use the OTP below to sign in to your account:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #4CAF50;">
              ${otp}
            </span>
          </div>
        </div>
        
        <p><strong>Important:</strong> This OTP is valid for 10 minutes only.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
    `
  })
};

// // Email templates
const emailTemplates = {
  orderConfirmation: (order, customer) => ({
    subject: `Order Confirmation - ${order.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your order!</h2>
        <p>Dear ${customer.firstName},</p>
        <p>Your order has been confirmed. Here are your order details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Order ID:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${order.orderId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">$${order.total.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${order.status}</td>
          </tr>
        </table>
        
        <p>We'll notify you when your order ships.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  }),

  shippingUpdate: (order, customer) => ({
    subject: `Your Order Has Shipped! - ${order.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your order is on the way!</h2>
        <p>Dear ${customer.firstName},</p>
        <p>Great news! Your order has shipped.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Order ID:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${order.orderId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tracking Number:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${order.trackingNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Shipping Method:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${order.shippingMethod}</td>
          </tr>
        </table>
        
        <p>You can track your package using the tracking number above.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  }),

  passwordReset: (user, resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  authEmailTemplates,
  emailTemplates
};
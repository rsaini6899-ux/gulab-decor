const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter valid 10-digit phone number']
  },
  otp: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 6
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - document will be deleted after expiresAt
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for faster queries
otpSchema.index({ phone: 1, otp: 1 });

module.exports = mongoose.model('OTP', otpSchema);
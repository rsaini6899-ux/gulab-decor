const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const razorpaySchema = new mongoose.Schema({
  keyId: {
    type: String,
    required: true,
    trim: true
  },
  keySecret: {
    type: String,
    required: true
  },
  webhookSecret: {
    type: String
  },
  isLive: {
    type: Boolean,
    default: false
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// ✅ Encrypt keySecret before saving
razorpaySchema.pre('save', async function(next) {
  if (!this.isModified('keySecret')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.keySecret = await bcrypt.hash(this.keySecret, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Encrypt webhookSecret if present
razorpaySchema.pre('save', async function(next) {
  if (!this.isModified('webhookSecret') || !this.webhookSecret) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.webhookSecret = await bcrypt.hash(this.webhookSecret, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Method to compare keySecret
razorpaySchema.methods.compareKeySecret = async function(enteredSecret) {
  return await bcrypt.compare(enteredSecret, this.keySecret);
};

// ✅ Method to compare webhookSecret
razorpaySchema.methods.compareWebhookSecret = async function(enteredSecret) {
  if (!this.webhookSecret) return false;
  return await bcrypt.compare(enteredSecret, this.webhookSecret);
};

// ✅ Virtual for decrypted secret (never send to frontend)
razorpaySchema.virtual('decryptedKeySecret').get(function() {
  return '***encrypted***'; // Never expose real secret
});

module.exports = mongoose.model('Razorpay', razorpaySchema);
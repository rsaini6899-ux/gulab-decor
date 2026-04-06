// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const razorpaySchema = new mongoose.Schema({
//   keyId: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   keySecret: {
//     type: String,
//     required: true
//   },
//   webhookSecret: {
//     type: String
//   },
//   isLive: {
//     type: Boolean,
//     default: false
//   },
//   isEnabled: {
//     type: Boolean,
//     default: true
//   },
//   updatedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }
// }, {
//   timestamps: true
// });

// // ✅ Encrypt keySecret before saving
// razorpaySchema.pre('save', async function(next) {
//   if (!this.isModified('keySecret')) return next();
  
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.keySecret = await bcrypt.hash(this.keySecret, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Encrypt webhookSecret if present
// razorpaySchema.pre('save', async function(next) {
//   if (!this.isModified('webhookSecret') || !this.webhookSecret) return next();
  
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.webhookSecret = await bcrypt.hash(this.webhookSecret, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Method to compare keySecret
// razorpaySchema.methods.compareKeySecret = async function(enteredSecret) {
//   return await bcrypt.compare(enteredSecret, this.keySecret);
// };

// // ✅ Method to compare webhookSecret
// razorpaySchema.methods.compareWebhookSecret = async function(enteredSecret) {
//   if (!this.webhookSecret) return false;
//   return await bcrypt.compare(enteredSecret, this.webhookSecret);
// };

// // ✅ Virtual for decrypted secret (never send to frontend)
// razorpaySchema.virtual('decryptedKeySecret').get(function() {
//   return '***encrypted***'; // Never expose real secret
// });


// module.exports = mongoose.model('Razorpay', razorpaySchema);


// models/razorpay.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const razorpaySchema = new mongoose.Schema({
  keyId: {
    type: String,
    required: true,
    trim: true
  },
  encryptedKeySecret: {  // ✅ एन्क्रिप्टेड वर्जन स्टोर करें
    type: String,
    required: true
  },
  keySecretIV: {  // ✅ Initialization Vector
    type: String,
    // required: true
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

// ✅ एन्क्रिप्शन फंक्शन
function encryptSecret(secret) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'my-secret-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex')
  };
}

// ✅ डिक्रिप्शन फंक्शन
function decryptSecret(encryptedData, ivHex) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'my-secret-key', 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ✅ Save से पहले एन्क्रिप्ट करें
razorpaySchema.pre('save', function(next) {
  if (!this.isModified('encryptedKeySecret') && this.encryptedKeySecret) {
    return next();
  }
  
  try {
    const { encryptedData, iv } = encryptSecret(this.encryptedKeySecret);
    this.encryptedKeySecret = encryptedData;
    this.keySecretIV = iv;
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Method to get decrypted secret (सिर्फ जरूरत पड़ने पर)
razorpaySchema.methods.getDecryptedKeySecret = function() {
  return decryptSecret(this.encryptedKeySecret, this.keySecretIV);
};

module.exports = mongoose.model('Razorpay', razorpaySchema);
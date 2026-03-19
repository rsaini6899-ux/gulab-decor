// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const shiprocketSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//     trim: true,
//     lowercase: true
//   },
//   password: {
//     type: String,
//     required: true
//   },
//   apiToken: {
//     type: String
//   },
//   channelId: {
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
//   pickupLocation: {
//     name: String,
//     address: String,
//     city: String,
//     state: String,
//     pincode: String,
//     phone: String
//   },
//   updatedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }
// }, {
//   timestamps: true
// });

// // ✅ Encrypt password before saving
// shiprocketSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
  
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Encrypt apiToken if present
// shiprocketSchema.pre('save', async function(next) {
//   if (!this.isModified('apiToken') || !this.apiToken) return next();
  
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.apiToken = await bcrypt.hash(this.apiToken, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Method to compare password
// shiprocketSchema.methods.comparePassword = async function(enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // ✅ Method to compare apiToken
// shiprocketSchema.methods.compareApiToken = async function(enteredToken) {
//   if (!this.apiToken) return false;
//   return await bcrypt.compare(enteredToken, this.apiToken);
// };

// module.exports = mongoose.model('Shiprocket', shiprocketSchema);


const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const shiprocketSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  // Store plain password securely (encrypted with different key)
  plainPassword: {
    type: String,
    required: false,
    select: false // Hide in normal queries
  },
  apiToken: {
    type: String,
    required: false
  },
  lastTokenRefresh: {
    type: Date,
    required: false
  },
  tokenExpiry: {
    type: Date,
    required: false
  },
  channelId: {
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
  pickupLocation: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Encrypt password before saving
shiprocketSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Also encrypt plainPassword if you want extra security
  if (this.isModified('plainPassword') && this.plainPassword) {
    // Use a different salt or encryption method
    const salt = await bcrypt.genSalt(12);
    this.plainPassword = await bcrypt.hash(this.plainPassword, salt);
  }
  
  next();
});

// Method to compare password
shiprocketSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to compare plainPassword (for API calls)
shiprocketSchema.methods.comparePlainPassword = async function(enteredPassword) {
  if (!this.plainPassword) return false;
  return await bcrypt.compare(enteredPassword, this.plainPassword);
};

module.exports = mongoose.model('Shiprocket', shiprocketSchema);
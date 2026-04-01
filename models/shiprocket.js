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
//   // Store plain password securely (encrypted with different key)
//   plainPassword: {
//     type: String,
//     required: false,
//     select: false // Hide in normal queries
//   },
//   apiToken: {
//     type: String,
//     required: false
//   },
//   lastTokenRefresh: {
//     type: Date,
//     required: false
//   },
//   tokenExpiry: {
//     type: Date,
//     required: false
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

// // Encrypt password before saving
// shiprocketSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }
  
//   // Also encrypt plainPassword if you want extra security
//   if (this.isModified('plainPassword') && this.plainPassword) {
//     // Use a different salt or encryption method
//     const salt = await bcrypt.genSalt(12);
//     this.plainPassword = await bcrypt.hash(this.plainPassword, salt);
//   }
  
//   next();
// });

// // Method to compare password
// shiprocketSchema.methods.comparePassword = async function(enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // Method to compare plainPassword (for API calls)
// shiprocketSchema.methods.comparePlainPassword = async function(enteredPassword) {
//   if (!this.plainPassword) return false;
//   return await bcrypt.compare(enteredPassword, this.plainPassword);
// };

// module.exports = mongoose.model('Shiprocket', shiprocketSchema);




// models/Shiprocket.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const shippingMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  minDays: {
    type: Number,
    // required: true
  },
  maxDays: {
    type: Number,
    // required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  freeShippingAbove: {
    type: Number,
    default: null
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

const shiprocketSchema = new mongoose.Schema({
  email: {
    type: String,
    // required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    // required: true
  },
  plainPassword: {
    type: String,
    required: false,
    select: false
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
  shippingMethods: [shippingMethodSchema], // ✅ Dynamic shipping methods
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
  
  if (this.isModified('plainPassword') && this.plainPassword) {
    const salt = await bcrypt.genSalt(12);
    this.plainPassword = await bcrypt.hash(this.plainPassword, salt);
  }
  
  // Initialize default shipping methods if not present
  if (!this.shippingMethods || this.shippingMethods.length === 0) {
    this.shippingMethods = [
      {
        name: 'Standard Shipping',
        displayName: 'Standard Shipping',
        description: '5-7 business days',
        minDays: 5,
        maxDays: 7,
        price: 0,
        isEnabled: true,
        isDefault: true
      },
      {
        name: 'Express Shipping',
        displayName: 'Express Shipping',
        description: '2-3 business days',
        minDays: 2,
        maxDays: 3,
        price: 99,
        isEnabled: true,
        isDefault: false
      },
      {
        name: 'Priority Shipping',
        displayName: 'Priority Shipping',
        description: '1 business day',
        minDays: 1,
        maxDays: 1,
        price: 199,
        isEnabled: true,
        isDefault: false
      }
    ];
  }
  
  next();
});

// Method to compare password
shiprocketSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to compare plainPassword
shiprocketSchema.methods.comparePlainPassword = async function(enteredPassword) {
  if (!this.plainPassword) return false;
  return await bcrypt.compare(enteredPassword, this.plainPassword);
};

module.exports = mongoose.model('Shiprocket', shiprocketSchema);
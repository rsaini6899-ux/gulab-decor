const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['billing', 'shipping'],
    required: true
  },
  firstName: String,
  lastName: String,
  company: String,
  address: String,
  apartment: String,
  city: String,
  state: String,
  country: String,
  zipCode: String,
  phone: String,
  isDefault: {
    type: Boolean,
    default: false
  }
});

const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please enter first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please enter last name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please enter email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  avatar: {
    public_id: String,
    url: String
  },
  addresses: [addressSchema],
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  customerType: {
    type: String,
    enum: ['regular', 'vip', 'wholesale'],
    default: 'regular'
  },
  taxNumber: String,
  notes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  averageOrderValue: {
    type: Number,
    default: 0
  },
  lastOrderDate: Date,
  firstOrderDate: Date,
  acceptsMarketing: {
    type: Boolean,
    default: false
  },
  creditBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  customFields: mongoose.Schema.Types.Mixed,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Update customer stats when orders change
customerSchema.methods.updateStats = async function() {
  const Order = mongoose.model('Order');
  
  const stats = await Order.aggregate([
    { $match: { customer: this._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$total' },
        lastOrderDate: { $max: '$createdAt' },
        firstOrderDate: { $min: '$createdAt' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.totalOrders = stats[0].totalOrders;
    this.totalSpent = stats[0].totalSpent;
    this.averageOrderValue = stats[0].totalOrders > 0 ? 
      stats[0].totalSpent / stats[0].totalOrders : 0;
    this.lastOrderDate = stats[0].lastOrderDate;
    this.firstOrderDate = stats[0].firstOrderDate;
  } else {
    this.totalOrders = 0;
    this.totalSpent = 0;
    this.averageOrderValue = 0;
    this.lastOrderDate = null;
    this.firstOrderDate = null;
  }
  
  await this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
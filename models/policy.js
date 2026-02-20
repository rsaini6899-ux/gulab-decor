const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Policy title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Policy type is required'],
    enum: {
      values: ['shipping', 'privacy', 'terms', 'return', 'refund', 'about', 'contact', 'faq', 'other'],
      message: 'Please select valid policy type'
    }
  },
  content: {
    type: String,
    required: [true, 'Policy content is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from title before saving
policySchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Index for better query performance
policySchema.index({ type: 1, isActive: 1 });
policySchema.index({ slug: 1 }, { unique: true });

// Virtual for human readable type
policySchema.virtual('typeLabel').get(function() {
  const typeLabels = {
    'shipping': 'Shipping Policy',
    'privacy': 'Privacy Policy',
    'terms': 'Terms & Conditions',
    'return': 'Return Policy',
    'refund': 'Refund Policy',
    'about': 'About Us',
    'contact': 'Contact Us',
    'faq': 'FAQs',
    'other': 'Other'
  };
  return typeLabels[this.type] || this.type;
});

const Policy = mongoose.model('Policy', policySchema);
module.exports = Policy;
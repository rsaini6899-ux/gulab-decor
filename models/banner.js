const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters']
  },
  image: {
    url: {
      type: String,
      required: [true, 'Banner image URL is required']
    },
    public_id: {
      type: String,
    },
    folder: {
      type: String,
      default: 'banners'
    }
  },
  ctaText: {
    type: String,
    default: 'Shop Now',
    trim: true
  },
  ctaLink: {
    type: String,
    default: '/products',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },
  position: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  targetUrl: {
    type: String,
    trim: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  deviceType: {
    type: String,
    enum: ['all', 'desktop', 'mobile', 'tablet'],
    default: 'all'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
bannerSchema.index({ status: 1, position: 1 });
bannerSchema.index({ isFeatured: 1 });
bannerSchema.index({ deviceType: 1 });

// Virtual for checking if banner is active
bannerSchema.virtual('isActive').get(function() {
  const now = new Date();
  return (
    this.status === 'active'
  );
});

// Pre-save middleware to ensure only one featured banner per device type
bannerSchema.pre('save', async function(next) {
  if (this.isFeatured && this.isModified('isFeatured')) {
    // If this is being set as featured, unfeature others of same device type
    await this.constructor.updateMany(
      { 
        _id: { $ne: this._id }, 
        deviceType: this.deviceType,
        isFeatured: true 
      },
      { $set: { isFeatured: false } }
    );
  }
  next();
});

module.exports = mongoose.model('Banner', bannerSchema);

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Review content is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  author: {
    name: {
      type: String,
      required: [true, 'Author name is required']
    },
    location: String,
    email: String
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  images: [{
    url: String,
    public_id: String,
    folder: String
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate average rating for product
reviewSchema.statics.calculateAverageRating = async function(productId) {
  const result = await this.aggregate([
    {
      $match: { 
        product: productId,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  try {
    await this.model('Product').findByIdAndUpdate(productId, {
      averageRating: result[0]?.averageRating || 0,
      totalReviews: result[0]?.totalReviews || 0
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

// Update product rating after saving review
reviewSchema.post('save', async function() {
  if (this.product && this.status === 'approved') {
    await this.constructor.calculateAverageRating(this.product);
  }
});

// Update product rating after updating review
reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.product && doc.status === 'approved') {
    await doc.constructor.calculateAverageRating(doc.product);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
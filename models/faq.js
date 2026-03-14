const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
  },
  category: {
    type: String,
    enum: ['general', 'shipping', 'returns', 'payment', 'product', 'account', 'other'],
    default: 'general',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for search functionality
faqSchema.index({ question: 'text', answer: 'text' });

// Method to increment view count
faqSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

module.exports = mongoose.model('FAQ', faqSchema);
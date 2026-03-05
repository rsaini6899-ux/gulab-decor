const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter category name'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  productCount: {
    type: Number,
    default: 0
  },
  
  attributeTemplates: [{
    name: { type: String, required: true },
    order: { type: Number, default: 0 }
  }],
  
  variationTypes: [{
    name: { type: String, required: true },
    values: [{ type: String, trim: true }],
    createdAt: { type: Date, default: Date.now }
  }],
  
}, {
  timestamps: true,
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true }
});

// ✅ IMPORTANT: Compound index for name + parent (यही सही unique constraint है)
categorySchema.index({ name: 1, parent: 1 }, { unique: true });

// Slug बनाते समय भी uniqueness के लिए parent को ध्यान में रखें
categorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    let baseSlug = this.name.toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists under same parent
    const Category = this.constructor;
    while (await Category.findOne({ 
      slug: slug, 
      parent: this.parent,
      _id: { $ne: this._id }
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  next();
});

// Virtual for children
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

module.exports = mongoose.model('Category', categorySchema);
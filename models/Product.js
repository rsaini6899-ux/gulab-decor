const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please enter product name'],
    trim: true
  },
  slug: {
    type: String,
    lowercase: true,
    index: true
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    required: [true, 'Please enter product description']
  },
  shortDescription: String,
  
  // Category
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },

  cost: Number,
  
  // Dynamic Attributes
  attributes: [{
    name: String,
    label: String,
    value: mongoose.Schema.Types.Mixed,
    unit: String
  }],

   // ✅ NEW: Centralized color-based images
  colorImages: [{
    color: {
      type: String,
      required: true
    },
    images: [{
      url: String,
      public_id: String,
      isMain: {
        type: Boolean,
        default: false
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  variations: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true
    },
    sku: String,
    price: Number,
    isMain: {
      type: Boolean,
      default: false
    },
    isGroupMain: {
      type: Boolean,
      default: false
    },
    isProductMainColor: {
      type: Boolean,
      default: false
    },
    comparePrice: Number,
    cost: Number,
    stock: {
      type: Number,
      default: 0
    },
    // ✅ REMOVE images array from here
    // images: [{...}] <- DELETE THIS
    color: String, // ✅ ADD this field
    attributes: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      display_name: String
    }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  }],

  // Technical Specifications
  specifications: [{
    category: String,
    items: [{
      label: String,
      value: String,
      unit: String
    }]
  }],
  
  // Inventory
  stock: {
    type: Number,
    default: 0
  },
  sold: {
    type: Number,
    default: 0
  },
 
  // Status & Flags
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'out_of_stock'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  bestseller: {
    type: Boolean,
    default: false
  },
  
  // Shipping
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  
  // Inventory Management
  trackInventory: {
    type: Boolean,
    default: true
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  
  // SEO
  seo: {
    title: String,
    description: String
  },
  
  // Auditing
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

// ✅ ADD virtual field to get variations with images
// productSchema.virtual('variationsWithImages').get(function() {
//   if (!this.variations) return [];
  
//   return this.variations.map(variation => {
//     const variationObj = variation.toObject ? variation.toObject() : { ...variation };
    
//     // Find images for this variation's color
//     if (this.colorImages && variation.color) {
//       const colorImageGroup = this.colorImages.find(ci => 
//         ci.color === variation.color
//       );
      
//       if (colorImageGroup && colorImageGroup.images) {
//         variationObj.images = colorImageGroup.images;
//       } else {
//         variationObj.images = [];
//       }
//     } else {
//       variationObj.images = [];
//     }
    
//     return variationObj;
//   });
// });
productSchema.virtual('variationsWithImages').get(function() {
  if (!this.variations) return [];
  
  return this.variations.map(variation => {
    const variationObj = variation.toObject ? variation.toObject() : { ...variation };
    
    // Find images for this variation's color from colorImages
    if (this.colorImages && variation.color) {
      const colorImageGroup = this.colorImages.find(ci => 
        ci.color === variation.color
      );
      
      if (colorImageGroup && colorImageGroup.images) {
        variationObj.images = colorImageGroup.images;
      } else {
        variationObj.images = [];
      }
    } else {
      variationObj.images = [];
    }
    
    return variationObj;
  });
});

// ✅ NEW: Add another virtual field for variations
productSchema.virtual('variationsList').get(function() {
  return this.variationsWithImages;
});

module.exports = mongoose.model('Product', productSchema);
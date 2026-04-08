// const mongoose = require('mongoose');

// const basicSchema = new mongoose.Schema({
//   // Company Information
//   companyName: {
//     type: String,
//     default: 'GulabDecor'
//   },
//   tagline: {
//     type: String,
//     default: 'Premium Home Decor'
//   },
  
//   // ✅ TWO LOGOS - Header aur Footer ke liye alag-alag
//   headerLogo: {           // Header ke liye logo
//     type: String,
//     default: ''
//   },
//   footerLogo: {           // Footer ke liye logo
//     type: String,
//     default: ''
//   },
  
//   // Optional: Dark mode versions (agar chahiye to)
//   headerLogoDark: {
//     type: String,
//     default: ''
//   },
//   footerLogoDark: {
//     type: String,
//     default: ''
//   },
  
//   description: {
//     type: String,
//     default: 'We bring elegance and comfort to your home with our premium collection of bedding, decor, and lifestyle products. Experience the perfect blend of style and quality.'
//   },
  
//   // Contact Information
//   address: {
//     type: String,
//     default: '123 Decor Street, Home City, HC 123456'
//   },
//   phone: {
//     type: String,
//     default: '+91 98765 43210'
//   },
//   email: {
//     type: String,
//     default: 'support@gulabdecor.com'
//   },
  
//   // Social Media Links
//   socialMedia: {
//     facebook: { type: String, default: '#' },
//     instagram: { type: String, default: '#' },
//     twitter: { type: String, default: '#' },
//     youtube: { type: String, default: '#' }
//   },
  
//   // Trust Badges / Features
//   features: [{
//     icon: { type: String },
//     title: { type: String },
//     description: { type: String }
//   }],
  
//   // Copyright Text
//   copyright: {
//     type: String,
//     default: 'All rights reserved.'
//   },
  
//   // Footer Links Display Settings
//   footerSettings: {
//     showPolicies: { type: Boolean, default: true },
//     showContact: { type: Boolean, default: true },
//     showSocial: { type: Boolean, default: true },
//     showFeatures: { type: Boolean, default: true }
//   },
  
//   // App Information
//   appVersion: {
//     type: String,
//     default: '27.0 (801)'
//   },
//    primaryColor: {
//     type: String,
//     default: '#f59e0b',
//   }
// }, {
//   timestamps: true
// });

// // ✅ Helper method to get logos
// basicSchema.methods.getLogos = function() {
//   return {
//     header: this.headerLogo,
//     footer: this.footerLogo,
//     headerDark: this.headerLogoDark,
//     footerDark: this.footerLogoDark
//   };
// };

// // Ensure only one document exists (singleton pattern)
// basicSchema.statics.getSingleton = async function() {
//   let basic = await this.findOne();
//   if (!basic) {
//     basic = await this.create({});
//   }
//   return basic;
// };

// // Helper method to get color with opacity variations
// basicSchema.methods.getColorVariants = function() {
//   const color = this.primaryColor;
//   return {
//     base: color,
//     light: this.adjustBrightness(color, 30),  // 30% lighter
//     dark: this.adjustBrightness(color, -20),  // 20% darker
//     border: color,
//     bg: this.adjustBrightness(color, 85),     // Very light for background
//     text: color
//   };
// };

// // Helper function to adjust brightness
// basicSchema.methods.adjustBrightness = function(hex, percent) {
//   // Convert hex to RGB
//   let r = parseInt(hex.slice(1,3), 16);
//   let g = parseInt(hex.slice(3,5), 16);
//   let b = parseInt(hex.slice(5,7), 16);
  
//   // Adjust brightness
//   r = Math.min(255, Math.max(0, r + (r * percent / 100)));
//   g = Math.min(255, Math.max(0, g + (g * percent / 100)));
//   b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
//   // Convert back to hex
//   return `#${Math.round(r).toString(16).padStart(2,'0')}${Math.round(g).toString(16).padStart(2,'0')}${Math.round(b).toString(16).padStart(2,'0')}`;
// };

// module.exports = mongoose.model('Basic', basicSchema);



// models/Basic.js - Complete updated model

const mongoose = require('mongoose');

const basicSchema = new mongoose.Schema({
  // Company Information
  companyName: {
    type: String,
    default: 'GulabDecor'
  },
  tagline: {
    type: String,
    default: 'Premium Home Decor'
  },
  
  // Logos
  headerLogo: {
    type: String,
    default: ''
  },
  footerLogo: {
    type: String,
    default: ''
  },
  
  headerLogoDark: {
    type: String,
    default: ''
  },
  footerLogoDark: {
    type: String,
    default: ''
  },
  
  description: {
    type: String,
    default: 'We bring elegance and comfort to your home with our premium collection of bedding, decor, and lifestyle products.'
  },
  
  // Contact Information
  address: {
    type: String,
    default: 'Sansthan Path, Jhalana Gram, Malviya Nagar, Jaipur - 302017, Rajasthan, India'
  },
  
  // Phone Numbers - 3 Different Numbers
  phoneNumbers: {
    customerSupport: {
      number: { type: String, default: '+91 98765 43210' },
      available: { type: String, default: 'Mon-Sat, 9AM-8PM' },
      label: { type: String, default: 'Customer Support' }
    },
    whatsapp: {
      number: { type: String, default: '+91 98765 43211' },
      available: { type: String, default: '24/7' },
      label: { type: String, default: 'WhatsApp' }
    },
    storeEnquiries: {
      number: { type: String, default: '+91 98765 43212' },
      available: { type: String, default: 'Mon-Fri, 10AM-6PM' },
      label: { type: String, default: 'Store Enquiries' }
    }
  },
  
  // Email Addresses - 3 Different Emails
  emails: {
    customerSupport: {
      email: { type: String, default: 'support@gulabdecor.com' },
      responseTime: { type: String, default: 'Within 24 hours' },
      label: { type: String, default: 'Customer Support' }
    },
    sales: {
      email: { type: String, default: 'sales@gulabdecor.com' },
      responseTime: { type: String, default: 'Within 12 hours' },
      label: { type: String, default: 'Sales' }
    },
    collaborations: {
      email: { type: String, default: 'collab@gulabdecor.com' },
      responseTime: { type: String, default: 'Within 48 hours' },
      label: { type: String, default: 'Collaborations' }
    }
  },
  
  // Business Hours
  businessHours: {
    weekdays: {
      days: { type: String, default: 'Monday - Friday' },
      hours: { type: String, default: '9:00 AM - 8:00 PM' }
    },
    saturday: {
      days: { type: String, default: 'Saturday' },
      hours: { type: String, default: '10:00 AM - 6:00 PM' }
    },
    sunday: {
      days: { type: String, default: 'Sunday' },
      hours: { type: String, default: 'Closed' },
      isClosed: { type: Boolean, default: true }
    },
    pickupNote: { type: String, default: 'Store pickup available during business hours' }
  },
  
  // Social Media Links
  socialMedia: {
    facebook: { type: String, default: 'https://facebook.com/gulabdecor' },
    instagram: { type: String, default: 'https://instagram.com/gulabdecor' },
    twitter: { type: String, default: 'https://twitter.com/gulabdecor' },
    youtube: { type: String, default: 'https://youtube.com/gulabdecor' }
  },
  
  // Trust Badges / Features
  features: [{
    icon: { type: String, default: 'FiTruck' },
    title: { type: String, default: 'Free Delivery' },
    description: { type: String, default: 'Free delivery on orders above ₹499' }
  }],
  
  // Copyright Text
  copyright: {
    type: String,
    default: 'All rights reserved.'
  },
  
  // Footer Settings
  footerSettings: {
    showPolicies: { type: Boolean, default: true },
    showContact: { type: Boolean, default: true },
    showSocial: { type: Boolean, default: true },
    showFeatures: { type: Boolean, default: true }
  },
  
  // App Information
  appVersion: {
    type: String,
    default: '27.0 (801)'
  },
  
  // Primary Color
  primaryColor: {
    type: String,
    default: '#f59e0b'
  },
  
  // Map Embed URL
  mapEmbedUrl: {
    type: String,
    default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3558.513462788529!2d75.835524!3d26.890636!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396db6b1b3c7b3b3%3A0x3b3b3b3b3b3b3b3b!2sMalviya%20Nagar%2C%20Jaipur%2C%20Rajasthan%20302017!5e0!3m2!1sen!2sin!4v1234567890'
  }
}, {
  timestamps: true
});

// Singleton pattern
basicSchema.statics.getSingleton = async function() {
  let basic = await this.findOne();
  if (!basic) {
    basic = await this.create({});
  }
  return basic;
};

// Helper method to get color variants
basicSchema.methods.getColorVariants = function() {
  const color = this.primaryColor;
  return {
    base: color,
    light: this.adjustBrightness(color, 30),
    dark: this.adjustBrightness(color, -20),
    border: color,
    bg: this.adjustBrightness(color, 85),
    text: color
  };
};

// Helper function to adjust brightness
basicSchema.methods.adjustBrightness = function(hex, percent) {
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
  return `#${Math.round(r).toString(16).padStart(2,'0')}${Math.round(g).toString(16).padStart(2,'0')}${Math.round(b).toString(16).padStart(2,'0')}`;
};

module.exports = mongoose.model('Basic', basicSchema);
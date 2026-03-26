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
  
  // ✅ TWO LOGOS - Header aur Footer ke liye alag-alag
  headerLogo: {           // Header ke liye logo
    type: String,
    default: ''
  },
  footerLogo: {           // Footer ke liye logo
    type: String,
    default: ''
  },
  
  // Optional: Dark mode versions (agar chahiye to)
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
    default: 'We bring elegance and comfort to your home with our premium collection of bedding, decor, and lifestyle products. Experience the perfect blend of style and quality.'
  },
  
  // Contact Information
  address: {
    type: String,
    default: '123 Decor Street, Home City, HC 123456'
  },
  phone: {
    type: String,
    default: '+91 98765 43210'
  },
  email: {
    type: String,
    default: 'support@gulabdecor.com'
  },
  
  // Social Media Links
  socialMedia: {
    facebook: { type: String, default: '#' },
    instagram: { type: String, default: '#' },
    twitter: { type: String, default: '#' },
    youtube: { type: String, default: '#' }
  },
  
  // Trust Badges / Features
  features: [{
    icon: { type: String },
    title: { type: String },
    description: { type: String }
  }],
  
  // Copyright Text
  copyright: {
    type: String,
    default: 'All rights reserved.'
  },
  
  // Footer Links Display Settings
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
   primaryColor: {
    type: String,
    default: '#f59e0b',
  }
}, {
  timestamps: true
});

// ✅ Helper method to get logos
basicSchema.methods.getLogos = function() {
  return {
    header: this.headerLogo,
    footer: this.footerLogo,
    headerDark: this.headerLogoDark,
    footerDark: this.footerLogoDark
  };
};

// Ensure only one document exists (singleton pattern)
basicSchema.statics.getSingleton = async function() {
  let basic = await this.findOne();
  if (!basic) {
    basic = await this.create({});
  }
  return basic;
};

// Helper method to get color with opacity variations
basicSchema.methods.getColorVariants = function() {
  const color = this.primaryColor;
  return {
    base: color,
    light: this.adjustBrightness(color, 30),  // 30% lighter
    dark: this.adjustBrightness(color, -20),  // 20% darker
    border: color,
    bg: this.adjustBrightness(color, 85),     // Very light for background
    text: color
  };
};

// Helper function to adjust brightness
basicSchema.methods.adjustBrightness = function(hex, percent) {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  
  // Adjust brightness
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
  // Convert back to hex
  return `#${Math.round(r).toString(16).padStart(2,'0')}${Math.round(g).toString(16).padStart(2,'0')}${Math.round(b).toString(16).padStart(2,'0')}`;
};

module.exports = mongoose.model('Basic', basicSchema);
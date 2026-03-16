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

module.exports = mongoose.model('Basic', basicSchema);
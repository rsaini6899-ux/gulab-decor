// models/Settings.js ya models/Favicon.js
const mongoose = require('mongoose');

const faviconSchema = new mongoose.Schema({
  icon: {
    url: String,
    public_id: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Favicon', faviconSchema);
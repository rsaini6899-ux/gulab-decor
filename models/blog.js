const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true
  },
  image: {
    url: String,
    public_id: String,
    folder: String
  },
  category: {
    type: String,
    required: [true, 'Blog category is required']
  },
  status: {
    type: String,
    default: 'draft'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Blog', blogSchema);
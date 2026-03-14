const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Folder ke hisaab se storage function
const getStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folderName,  // 'banners', 'blogs', 'categories', 'products'
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
  });
};

// Upload middleware
const uploadToCloudinary = (folderName) => {
  const storage = getStorage(folderName);
  return multer({ storage });
};

module.exports = { cloudinary, uploadToCloudinary };
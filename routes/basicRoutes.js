const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middleware/auth');
const { cloudinaryUpload, processCloudinaryResponse } = require('../middleware/upload');

const {
  getBasicInfo,
  updateBasicInfo,
  updateSocialMedia,
  updateFeatures,
  updateFooterSettings,
  uploadLogos,
  removeLogo
} = require('../controllers/basicController');

// Public route - Get basic info
router.get('/', getBasicInfo);

// Protected routes (Admin only)
router.put('/', authMiddleware, updateBasicInfo);
router.patch('/social', authMiddleware, updateSocialMedia);
router.patch('/features', authMiddleware, updateFeatures);
router.patch('/footer-settings', authMiddleware, updateFooterSettings);

router.post(
  '/upload-logos',
  authMiddleware,
  cloudinaryUpload('logos').fields([
    { name: 'logo', maxCount: 1 },         
    { name: 'headerLogo', maxCount: 1 },     
    { name: 'footerLogo', maxCount: 1 },      
    { name: 'image', maxCount: 1 }             
  ]),
  processCloudinaryResponse,
  uploadLogos
);  


module.exports = router;
const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middleware/auth');
// const upload = require('../middleware/upload');
const { cloudinaryUpload, processCloudinaryResponse } = require('../middleware/upload');

// Public routes
router.get('/', bannerController.getAllBanners);
router.get('/active', bannerController.getActiveBanners);
router.get('/:id', bannerController.getBanner);

// Protected routes (Admin only)
// router.post(
//   '/',
//   authMiddleware,
//   upload.fields([{ name: 'image', maxCount: 1 }]),
//   upload.processImage('banners'),
//   bannerController.createBanner
// );
router.post(
  '/',
  authMiddleware,
  cloudinaryUpload('banners').fields([
    { name: 'desktopImage', maxCount: 1 },  // ✅ Yeh sahi hai
    { name: 'mobileImage', maxCount: 1 }    // ✅ Yeh sahi hai
  ]),
  processCloudinaryResponse,
  bannerController.createBanner
);

// router.put(
//   '/:id',
//   authMiddleware,
//   upload.fields([{ name: 'image', maxCount: 1 }]),
//   upload.processImage('banners'),
//   bannerController.updateBanner
// );
router.put(
  '/:id',
  authMiddleware,
cloudinaryUpload('banners').fields([{ name: 'image', maxCount: 1 }]),
  processCloudinaryResponse,
  bannerController.updateBanner
);
 
router.delete('/:id', authMiddleware, bannerController.deleteBanner);

// router.post(
//   '/upload-image',
//   authMiddleware,
//   upload.fields([{ name: 'image', maxCount: 1 }]),
//   upload.processImage('banners'),
//   bannerController.uploadBannerImage
// );

router.post(
  '/upload-image',
  authMiddleware,
  cloudinaryUpload('banners').fields([{ name: 'image', maxCount: 1 }]),
  processCloudinaryResponse,
  bannerController.uploadBannerImage
);

router.put('/reorder', authMiddleware, bannerController.reorderBanners);
router.put('/:id/toggle-status', authMiddleware, bannerController.toggleBannerStatus);

module.exports = router;
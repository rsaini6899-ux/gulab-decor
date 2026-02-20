const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', bannerController.getAllBanners);
router.get('/active', bannerController.getActiveBanners);
router.get('/:id', bannerController.getBanner);

// Protected routes (Admin only)
router.post(
  '/',
  authMiddleware,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  upload.processImage('banners'),
  bannerController.createBanner
);

router.put(
  '/:id',
  authMiddleware,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  upload.processImage('banners'),
  bannerController.updateBanner
);

router.delete('/:id', authMiddleware, bannerController.deleteBanner);

router.post(
  '/upload-image',
  authMiddleware,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  upload.processImage('banners'),
  bannerController.uploadBannerImage
);

router.put('/reorder', authMiddleware, bannerController.reorderBanners);
router.put('/:id/toggle-status', authMiddleware, bannerController.toggleBannerStatus);

module.exports = router;
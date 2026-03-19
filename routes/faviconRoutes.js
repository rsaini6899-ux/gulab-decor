const express = require('express');
const router = express.Router();
const { cloudinaryUpload, processCloudinaryResponse } = require('../middleware/upload');
const faviconController = require('../controllers/faviconController');
const authMiddleware = require('../middleware/auth');

// Public route - get active favicon
router.get('/active', faviconController.getActiveFavicon);

// Protected routes (admin only)
router.post(
  '/upload',
  authMiddleware,
  cloudinaryUpload('favicon').single('icon'),
  processCloudinaryResponse,
  faviconController.uploadFavicon
);

router.delete('/:id', authMiddleware, faviconController.deleteFavicon);

module.exports = router;
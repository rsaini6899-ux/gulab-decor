const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', reviewController.getAllReviews);
router.get('/approved', reviewController.getApprovedReviews);
router.get('/stats', reviewController.getReviewStats);
router.get('/:id', reviewController.getReviewById);
router.post('/:id/helpful', reviewController.markHelpful);

// Protected routes (admin)
router.post(
  '/',
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 5 }]),
  upload.processImage('reviews'),
  reviewController.createReview
);

router.put(
  '/:id',
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 5 }]),
  upload.processImage('reviews'),
  reviewController.updateReview
);

router.delete('/:id', authMiddleware, reviewController.deleteReview);

router.post(
  '/upload-images',
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 5 }]),
  upload.processImage('reviews'),
  reviewController.uploadReviewImages
);

module.exports = router;
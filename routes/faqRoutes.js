const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
// const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/public', faqController.getPublicFAQs);

// Admin routes (protected)
router.route('/')
  .get(faqController.getAllFAQs)
  .post(faqController.createFAQ);

router.route('/:id')
  .get(faqController.getFAQById)
  .put(faqController.updateFAQ)
  .delete(faqController.deleteFAQ);

router.patch('/:id/toggle-status', faqController.toggleStatus);

module.exports = router;
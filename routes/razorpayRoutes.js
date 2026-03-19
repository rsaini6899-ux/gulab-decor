const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/razorpayController');
const authMiddleware = require('../middleware/auth');

// Public route - get active settings (for checkout)
router.get('/settings', razorpayController.getRazorpaySettings);

// Protected routes (admin only)
router.post('/settings', authMiddleware, razorpayController.saveRazorpaySettings);

// Webhook route (public - Razorpay calls this)
router.post('/webhook', razorpayController.verifyWebhook);

module.exports = router;
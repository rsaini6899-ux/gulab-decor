const express = require('express');
const router = express.Router();
const shiprocketController = require('../controllers/shiprocketController');
const authMiddleware = require('../middleware/auth');

// Protected routes (admin only)
router.get('/settings', authMiddleware, shiprocketController.getShiprocketSettings);
router.post('/settings', authMiddleware, shiprocketController.saveShiprocketSettings);
router.post('/test-connection', authMiddleware, shiprocketController.testShiprocketConnection);

// Public route for tracking (optional)
// router.get('/track/:awb', shiprocketController.trackShipment);

module.exports = router;
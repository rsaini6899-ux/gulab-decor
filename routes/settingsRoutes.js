const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// All settings routes require admin role
router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.put('/store', settingsController.updateStoreSettings);
router.put('/payment', settingsController.updatePaymentSettings);
router.put('/shipping', settingsController.updateShippingSettings);
router.put('/email', settingsController.updateEmailSettings);
router.put('/notifications', settingsController.updateNotificationSettings);
router.post('/email/test', settingsController.testEmailConfig);
router.post('/cache/clear', settingsController.clearCache);
router.post('/backup', settingsController.backupDatabase);

module.exports = router;
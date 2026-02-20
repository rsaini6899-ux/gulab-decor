const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// All analytics routes require admin/manager role
router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);
router.get('/products', analyticsController.getProductAnalytics);
router.get('/traffic', analyticsController.getTrafficAnalytics);

module.exports = router;
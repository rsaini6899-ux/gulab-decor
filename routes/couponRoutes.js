const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
// const authMiddleware = require('../middleware/auth');
// const roleMiddleware = require('../middleware/role');

// router.use(authMiddleware);

// Public route for coupon validation (not protected for customers)
router.post('/apply', couponController.applyCoupon);

// Admin routes
router.route('/')
  .get(couponController.getAllCoupons)
  .post(couponController.createCoupon);

router.route('/:id')
  .get(couponController.getCouponById)
  .put(couponController.updateCoupon)
  .delete(couponController.deleteCoupon);

router.patch('/:id/toggle-status', couponController.toggleStatus);
router.patch('/:id/toggle-visibility', couponController.toggleVisibility);
router.post('/:id/record-usage', couponController.recordUsage);
router.get('/stats/overview', couponController.getStats);

module.exports = router;
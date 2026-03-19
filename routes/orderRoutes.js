const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Public routes
router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);


router.get('/my/orders', authMiddleware, orderController.getMyOrders);


// Protected routes (admin/manager only)
router.post('/', authMiddleware, orderController.createOrder);
router.put('/:id', authMiddleware, orderController.updateOrder);
router.delete('/:id', authMiddleware, orderController.deleteOrder);
router.put('/:id/status', authMiddleware, orderController.updateOrderStatus);
router.post('/:id/notes', authMiddleware, orderController.addOrderNote);
router.post('/:id/refund', authMiddleware, orderController.processRefund);

// COD Order Routes
router.post('/create-cod-order', authMiddleware, orderController.createCODOrder);

// Razorpay payment routes
router.post('/create-razorpay-order', authMiddleware, orderController.createRazorpayOrder);
router.post('/verify-razorpay-payment', authMiddleware,  orderController.verifyRazorpayPayment);

// Shipment routes (admin only)
router.post('/:orderId/shipment', authMiddleware, orderController.createShipment);
router.get('/track/:awb', orderController.trackShipment);
router.post('/shipment/:shipmentId/cancel', authMiddleware, orderController.cancelShipment);

// Order management routes
router.put('/cancel/:orderId', authMiddleware, orderController.cancelOrder);

// new
router.get('/customer/:customerId', authMiddleware, orderController.getCustomerOrders);


module.exports = router;
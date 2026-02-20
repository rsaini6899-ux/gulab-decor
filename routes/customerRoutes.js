const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Public routes
router.get('/', customerController.getAllCustomers);
router.get('/search', customerController.searchCustomers);
router.get('/stats', customerController.getCustomerStats);
router.get('/:id', customerController.getCustomer);
router.get('/:id/orders', customerController.getCustomerOrders);

// Protected routes (admin/manager only)
router.post('/', authMiddleware, customerController.createCustomer);
router.put('/:id', authMiddleware, customerController.updateCustomer);
router.delete('/:id', authMiddleware, customerController.deleteCustomer);
router.post('/:id/addresses', authMiddleware, customerController.addAddress);
router.put('/:id/addresses/:addressId', authMiddleware, customerController.updateAddress);
router.delete('/:id/addresses/:addressId', authMiddleware, customerController.deleteAddress);
router.post('/:id/notes', authMiddleware, customerController.addNote);

module.exports = router;
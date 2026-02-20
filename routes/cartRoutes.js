const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/cartController');
const authMiddleware = require('../middleware/auth');

router.post('/add', authMiddleware, categoryController.addItemToCart);
router.get('/', authMiddleware, categoryController.getCartItems);
router.put('/update/:productId/:variationId', authMiddleware, categoryController.updateItemQuantity);
router.delete('/remove/:productId/:variationId', authMiddleware, categoryController.removeItemFromCart);
router.delete('/clear', authMiddleware, categoryController.clearCart);

module.exports = router;
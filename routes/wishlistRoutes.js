const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/auth');

router.post('/add', authMiddleware, categoryController.addItemToWishlist);
router.get('/', authMiddleware, categoryController.getWishlistItems);
router.delete('/remove/:productId/:variationId', authMiddleware, categoryController.removeItemFromWishlist);
router.delete('/clear', authMiddleware, categoryController.clearWishlist);

module.exports = router;
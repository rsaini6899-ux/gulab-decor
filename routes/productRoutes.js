const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/featured-bestseller', productController.getFeaturedAndBestsellerProducts);
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Upload routes
router.post('/upload-images', 
  upload.array('images', 10),
  upload.processImage('products'),
  productController.uploadProductImages
);


// Protected routes (admin only)
router.post('/', 
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 10 }]),
  upload.processImage('products'),
  productController.createProduct
);

router.put('/:id', 
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 10 }]),
  upload.processImage('products'),
  productController.updateProduct
);

router.delete('/:id', authMiddleware, productController.deleteProduct);
router.delete('/bulk/delete', authMiddleware, productController.bulkDeleteProducts);
router.put('/:id/stock', authMiddleware, productController.updateStock);

// ✅ NEW: Attributes management
router.put('/:id/attributes', authMiddleware, productController.updateAttributes);

// ✅ NEW: Specifications management
router.post('/:id/specifications', authMiddleware, productController.addSpecification);
router.put('/:id/specifications/:specIndex', authMiddleware, productController.updateSpecification);
router.delete('/:id/specifications/:specIndex', authMiddleware, productController.deleteSpecification);

// ✅ NEW: Variations management
router.get('/:id/variations', authMiddleware, productController.getProductVariations);
router.post('/:id/variations', authMiddleware, productController.addVariation);
router.post('/:id/variations/bulk', authMiddleware, productController.bulkAddVariations);
router.put('/:id/variations/bulk', productController.bulkUpdateVariations);
router.put('/:id/variations/:variationId', authMiddleware, productController.updateVariation);
router.delete('/:id/variations/:variationId', authMiddleware, productController.deleteVariation);

// ✅ Variation Images Management
router.post('/:id/variations/:variationId/images',
  authMiddleware,
  upload.array('images', 10),
  upload.processImage('variations'),
  productController.addImagesToVariation
);

router.delete('/:id/variations/:variationId/images/:imageId',
  authMiddleware,
  productController.removeVariationImage
);

router.put('/:id/variations/:variationId/images/:imageId/set-main',
  authMiddleware,
  productController.setMainVariationImage
);


router.get('/slug/:slug', productController.getProductBySlug);
router.get('/details/:id', productController.getProductDetails);


router.get('/categories/slug/:categorySlug/subcategories', productController.getSubCategoriesByCategorySlug);
router.get('/categories/slug/:categorySlug/products', productController.getProductsByCategorySlug);
router.get('/categories/:categorySlug/:subCategorySlug/products', productController.getProductsBySubCategorySlug);
module.exports = router;

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { cloudinaryUpload, processCloudinaryResponse } = require('../middleware/upload');
// const upload = require('../middleware/upload');

// const authMiddleware = require('../middleware/auth');
// router.use(authMiddleware);

router.get('/:id/attribute-templates', categoryController.getAttributeTemplates);
router.put('/:id/attribute-templates', categoryController.updateAttributeTemplates);
router.put('/update-variation-values', categoryController.updateVariationTypeValues);

router.post('/upload-image', 
  // upload.single('image'),
  cloudinaryUpload('categories').single('image'),
  // upload.processImage('categories'), 
  processCloudinaryResponse,
  categoryController.uploadCategoryImage
);

router.get('/', categoryController.getAllCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/tree', categoryController.getCategoryTree);
router.get('/flat', categoryController.getFlatCategories);
router.get('/featured', categoryController.getOnlyFeaturedCategories);
router.get('/nested', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
// Get subcategories of a specific category
router.get('/:categoryId/subcategories', categoryController.getSubCategories);
router.get('/:parentId/children', categoryController.getChildCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/level/:level', categoryController.getCategoriesByLevel);

// Get category with all children (nested)
router.get('/:categoryId/with-children', categoryController.getCategoryWithChildren);

// Get all categories with hierarchy (for dropdowns)
router.get('/hierarchy/all', categoryController.getCategoriesHierarchy);


router.put('/:id',
  cloudinaryUpload('categories').single('image'),
  processCloudinaryResponse,
  categoryController.updateCategory
);

router.delete('/:id', categoryController.deleteCategory);

router.post('/batch', categoryController.createMultipleCategories);


module.exports = router;
const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', blogController.getAllBlogs);
router.get('/published', blogController.getPublishedBlogs);
router.get('/categories', blogController.getBlogCategories);
router.get('/:id', blogController.getBlogById);

// Protected routes (admin)
router.post(
  '/',
  authMiddleware,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  upload.processImage('blogs'),
  blogController.createBlog
);

router.put(
  '/:id',
  authMiddleware,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  upload.processImage('blogs'),
  blogController.updateBlog
);

router.delete('/:id', authMiddleware, blogController.deleteBlog);

router.post(
  '/upload-image',
  authMiddleware,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  upload.processImage('blogs'),
  blogController.uploadBlogImage
);

module.exports = router;
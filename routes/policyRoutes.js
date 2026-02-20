const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
// const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/public/slug/:slug', policyController.getPolicyBySlug);
router.get('/public/type/:type', policyController.getPoliciesByType);

// Admin routes (protected)
// router.use(protect);
// router.use(authorize('admin'));

router.route('/')
  .get(policyController.getAllPolicies)
  .post(policyController.createPolicy);
  
router.route('/:id')
  .get(policyController.getPolicyById)
  .put(policyController.updatePolicy)
  .delete(policyController.deletePolicy);

router.patch('/:id/toggle-status', policyController.toggleStatus);

module.exports = router;
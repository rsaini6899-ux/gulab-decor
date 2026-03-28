const express = require("express");
const router = express.Router();
const {
  getDashboardData,
  getDashboardStats,
  getSalesChartData,
  getTopProducts,
  getRecentOrders,
  getOrderStatus,
  getPaymentMethods,
  getLowStockProducts,
  getRecentActivities
} = require("../controllers/dashboardController");
const authMiddleware = require('../middleware/auth');

// All dashboard routes are protected
router.use(authMiddleware);

// Main dashboard data endpoint (all data in one call)
router.get("/", getDashboardData);

// Individual endpoints
router.get("/stats", getDashboardStats);
router.get("/sales-chart", getSalesChartData);
router.get("/top-products", getTopProducts);
router.get("/recent-orders", getRecentOrders);
router.get("/order-status", getOrderStatus);
router.get("/payment-methods", getPaymentMethods);
router.get("/low-stock", getLowStockProducts);
router.get("/recent-activities", getRecentActivities);

module.exports = router;
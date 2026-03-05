// const Order = require("../models/Order");
// const Product = require("../models/Product");
// const User = require("../models/User");
// const Category = require("../models/Category");

// // @desc    Get all dashboard data in one call
// // @route   GET /api/dashboard
// // @access  Private/Admin
// exports.getDashboardData = async (req, res) => {
//   try {
//     const { range = "week" } = req.query;
    
//     // Get date ranges
//     const dateRanges = getDateRanges(range);
    
//     // Run all queries in parallel
//     const [
//       stats,
//       salesChart,
//       topProducts,
//       recentOrders,
//       categoryDistribution,
//       orderStatus,
//       paymentMethods,
//       lowStock,
//       recentActivities
//     ] = await Promise.all([
//       // Get stats
//       getStatsData(dateRanges),
      
//       // Get sales chart data
//       getSalesChartDataQuery(range),
      
//       // Get top products
//       getTopProductsQuery(range, 5),
      
//       // Get recent orders
//       Order.find()
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .populate("customer", "name email")
//         .select("orderId customer total status paymentStatus createdAt items"),
      
//       // Get category distribution
//       Product.aggregate([
//         {
//           $lookup: {
//             from: "categories",
//             localField: "category",
//             foreignField: "_id",
//             as: "categoryInfo"
//           }
//         },
//         { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
//         {
//           $group: {
//             _id: { $ifNull: ["$categoryInfo.name", "Uncategorized"] },
//             count: { $sum: 1 }
//           }
//         },
//         { $sort: { count: -1 } }
//       ]),
      
//       // Get order status distribution
//       Order.aggregate([
//         {
//           $group: {
//             _id: "$status",
//             count: { $sum: 1 }
//           }
//         }
//       ]),
      
//       // Get payment method distribution
//       Order.aggregate([
//         {
//           $match: {
//             createdAt: { $gte: dateRanges.current.start, $lte: dateRanges.current.end }
//           }
//         },
//         {
//           $group: {
//             _id: "$paymentMethod",
//             count: { $sum: 1 },
//             total: { $sum: "$total" }
//           }
//         }
//       ]),
      
//       // Get low stock products - FIXED QUERY
//       getLowStockProducts(),
      
//       // Get recent activities
//       getRecentActivitiesQuery()
//     ]);

//     // Format category distribution
//     const totalProducts = await Product.countDocuments();
//     const formattedCategoryDist = categoryDistribution.map(item => ({
//       name: item._id || "Uncategorized",
//       value: item.count,
//       percentage: totalProducts ? ((item.count / totalProducts) * 100).toFixed(1) : 0
//     }));

//     // Format order status
//     const totalOrders = await Order.countDocuments();
//     const formattedOrderStatus = orderStatus.map(item => ({
//       status: item._id || "unknown",
//       count: item.count,
//       percentage: totalOrders ? ((item.count / totalOrders) * 100).toFixed(1) : 0
//     }));

//     // Format payment methods
//     const formattedPaymentMethods = paymentMethods.map(item => ({
//       name: item._id?.replace(/_/g, " ").toUpperCase() || "OTHER",
//       value: item.count,
//       total: item.total
//     }));

//     // Format recent orders
//     const formattedRecentOrders = recentOrders.map(order => ({
//       _id: order._id,
//       orderId: order.orderId,
//       customer: order.customer,
//       total: order.total,
//       status: order.status,
//       paymentStatus: order.paymentStatus,
//       createdAt: order.createdAt,
//       itemsCount: order.items?.length || 0
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         stats: stats.stats,
//         monthlyTarget: stats.monthlyTarget,
//         salesData: salesChart,
//         topProducts,
//         recentOrders: formattedRecentOrders,
//         categoryDistribution: formattedCategoryDist,
//         orderStatusData: formattedOrderStatus,
//         paymentMethodData: formattedPaymentMethods,
//         lowStockProducts: lowStock,
//         recentActivities
//       }
//     });
//   } catch (error) {
//     console.error("Dashboard data error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching dashboard data",
//       error: error.message
//     });
//   }
// };

// // @desc    Get dashboard statistics
// // @route   GET /api/dashboard/stats
// // @access  Private/Admin
// exports.getDashboardStats = async (req, res) => {
//   try {
//     const { range = "week" } = req.query;
    
//     // Get date ranges
//     const dateRanges = getDateRanges(range);
    
//     // Run all queries in parallel
//     const [
//       currentOrders,
//       previousOrders,
//       users,
//       products,
//       orderStatusStats,
//       paymentMethodStats,
//       lowStockProducts
//     ] = await Promise.all([
//       // Current period orders
//       Order.find({
//         createdAt: { $gte: dateRanges.current.start, $lte: dateRanges.current.end }
//       }).populate("customer", "name email"),
      
//       // Previous period orders
//       Order.find({
//         createdAt: { $gte: dateRanges.previous.start, $lte: dateRanges.previous.end }
//       }),
      
//       // All users with role 'user'
//       User.countDocuments({ role: "user" }),
      
//       // All products count
//       Product.countDocuments(),
      
//       // Order status distribution
//       Order.aggregate([
//         {
//           $group: {
//             _id: "$status",
//             count: { $sum: 1 }
//           }
//         }
//       ]),
      
//       // Payment method distribution
//       Order.aggregate([
//         {
//           $match: {
//             createdAt: { $gte: dateRanges.current.start, $lte: dateRanges.current.end }
//           }
//         },
//         {
//           $group: {
//             _id: "$paymentMethod",
//             count: { $sum: 1 },
//             total: { $sum: "$total" }
//           }
//         }
//       ]),
      
//       // Low stock products - FIXED QUERY
//       getLowStockProducts()
//     ]);

//     // Calculate current period stats
//     const currentRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
//     const currentOrdersCount = currentOrders.length;
    
//     // Calculate previous period stats
//     const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
//     const previousOrdersCount = previousOrders.length;

//     // Calculate changes
//     const revenueChange = previousRevenue 
//       ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) 
//       : 0;
//     const ordersChange = previousOrdersCount 
//       ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount * 100).toFixed(1) 
//       : 0;

//     // Calculate average order value
//     const currentAvgOrder = currentOrdersCount ? currentRevenue / currentOrdersCount : 0;
//     const previousAvgOrder = previousOrdersCount ? previousRevenue / previousOrdersCount : 0;
//     const avgOrderChange = previousAvgOrder 
//       ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder * 100).toFixed(1) 
//       : 0;

//     // Estimate conversion rate (assuming 5000 visitors - you can track this separately)
//     const estimatedVisitors = 5000;
//     const conversionRate = estimatedVisitors ? (currentOrdersCount / estimatedVisitors * 100).toFixed(2) : 0;

//     // Monthly target (current month)
//     const monthStart = new Date();
//     monthStart.setDate(1);
//     monthStart.setHours(0, 0, 0, 0);
    
//     const monthEnd = new Date();
//     monthEnd.setMonth(monthEnd.getMonth() + 1);
//     monthEnd.setDate(0);
//     monthEnd.setHours(23, 59, 59, 999);

//     const monthOrders = await Order.find({
//       createdAt: { $gte: monthStart, $lte: monthEnd },
//       status: { $ne: "cancelled" }
//     });
    
//     const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
//     const monthlyTarget = 500000; // You can make this configurable

//     // Format order status data
//     const totalOrders = await Order.countDocuments();
//     const orderStatusData = orderStatusStats.map(item => ({
//       status: item._id || "unknown",
//       count: item.count,
//       percentage: totalOrders ? ((item.count / totalOrders) * 100).toFixed(1) : 0
//     }));

//     // Format payment method data
//     const paymentMethodData = paymentMethodStats.map(item => ({
//       name: item._id?.replace(/_/g, " ").toUpperCase() || "OTHER",
//       value: item.count,
//       total: item.total
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         stats: {
//           revenue: {
//             total: currentRevenue,
//             change: revenueChange,
//             trend: revenueChange >= 0 ? "up" : "down"
//           },
//           orders: {
//             total: currentOrdersCount,
//             change: ordersChange,
//             trend: ordersChange >= 0 ? "up" : "down"
//           },
//           customers: {
//             total: users,
//             change: 8.1,
//             trend: "up"
//           },
//           products: {
//             total: products,
//             change: 2.3,
//             trend: "up"
//           },
//           avgOrderValue: {
//             total: currentAvgOrder,
//             change: avgOrderChange,
//             trend: avgOrderChange >= 0 ? "up" : "down"
//           },
//           conversionRate: {
//             total: conversionRate,
//             change: 0.5,
//             trend: "up"
//           }
//         },
//         monthlyTarget: {
//           achieved: monthRevenue,
//           total: monthlyTarget,
//           percentage: monthlyTarget ? ((monthRevenue / monthlyTarget) * 100).toFixed(1) : 0
//         },
//         orderStatusData,
//         paymentMethodData,
//         lowStockProducts
//       }
//     });
//   } catch (error) {
//     console.error("Dashboard stats error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching dashboard stats",
//       error: error.message
//     });
//   }
// };

// // @desc    Get sales chart data
// // @route   GET /api/dashboard/sales-chart
// // @access  Private/Admin
// exports.getSalesChartData = async (req, res) => {
//   try {
//     const { range = "week" } = req.query;
    
//     const salesData = await getSalesChartDataQuery(range);

//     res.status(200).json({
//       success: true,
//       data: salesData
//     });
//   } catch (error) {
//     console.error("Sales chart error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching sales chart data",
//       error: error.message
//     });
//   }
// };

// // @desc    Get top products
// // @route   GET /api/dashboard/top-products
// // @access  Private/Admin
// exports.getTopProducts = async (req, res) => {
//   try {
//     const { limit = 5, range = "week" } = req.query;
    
//     const topProducts = await getTopProductsQuery(range, parseInt(limit));

//     res.status(200).json({
//       success: true,
//       data: topProducts
//     });
//   } catch (error) {
//     console.error("Top products error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching top products",
//       error: error.message
//     });
//   }
// };

// // @desc    Get recent orders
// // @route   GET /api/dashboard/recent-orders
// // @access  Private/Admin
// exports.getRecentOrders = async (req, res) => {
//   try {
//     const { limit = 5 } = req.query;

//     const recentOrders = await Order.find()
//       .sort({ createdAt: -1 })
//       .limit(parseInt(limit))
//       .populate("customer", "name email")
//       .select("orderId customer total status paymentStatus createdAt items");

//     const formattedOrders = recentOrders.map(order => ({
//       _id: order._id,
//       orderId: order.orderId,
//       customer: order.customer,
//       total: order.total,
//       status: order.status,
//       paymentStatus: order.paymentStatus,
//       createdAt: order.createdAt,
//       itemsCount: order.items?.length || 0
//     }));

//     res.status(200).json({
//       success: true,
//       data: formattedOrders
//     });
//   } catch (error) {
//     console.error("Recent orders error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching recent orders",
//       error: error.message
//     });
//   }
// };

// // @desc    Get category distribution
// // @route   GET /api/dashboard/category-distribution
// // @access  Private/Admin
// exports.getCategoryDistribution = async (req, res) => {
//   try {
//     const distribution = await Product.aggregate([
//       {
//         $lookup: {
//           from: "categories",
//           localField: "category",
//           foreignField: "_id",
//           as: "categoryInfo"
//         }
//       },
//       { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: { $ifNull: ["$categoryInfo.name", "Uncategorized"] },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { count: -1 } }
//     ]);

//     const total = await Product.countDocuments();
    
//     const formattedDistribution = distribution.map(item => ({
//       name: item._id,
//       value: item.count,
//       percentage: total ? ((item.count / total) * 100).toFixed(1) : 0
//     }));

//     res.status(200).json({
//       success: true,
//       data: formattedDistribution
//     });
//   } catch (error) {
//     console.error("Category distribution error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching category distribution",
//       error: error.message
//     });
//   }
// };

// // @desc    Get recent activities
// // @route   GET /api/dashboard/recent-activities
// // @access  Private/Admin
// exports.getRecentActivities = async (req, res) => {
//   try {
//     const activities = await getRecentActivitiesQuery();

//     res.status(200).json({
//       success: true,
//       data: activities
//     });
//   } catch (error) {
//     console.error("Recent activities error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching recent activities",
//       error: error.message
//     });
//   }
// };

// // Helper functions
// const getDateRanges = (range) => {
//   const now = new Date();
//   const current = { start: new Date(), end: new Date() };
//   const previous = { start: new Date(), end: new Date() };
  
//   switch(range) {
//     case "day":
//       current.start.setDate(now.getDate() - 1);
//       previous.start.setDate(now.getDate() - 2);
//       previous.end.setDate(now.getDate() - 1);
//       break;
//     case "week":
//       current.start.setDate(now.getDate() - 7);
//       previous.start.setDate(now.getDate() - 14);
//       previous.end.setDate(now.getDate() - 7);
//       break;
//     case "month":
//       current.start.setMonth(now.getMonth() - 1);
//       previous.start.setMonth(now.getMonth() - 2);
//       previous.end.setMonth(now.getMonth() - 1);
//       break;
//     case "year":
//       current.start.setFullYear(now.getFullYear() - 1);
//       previous.start.setFullYear(now.getFullYear() - 2);
//       previous.end.setFullYear(now.getFullYear() - 1);
//       break;
//     default:
//       current.start.setDate(now.getDate() - 7);
//       previous.start.setDate(now.getDate() - 14);
//       previous.end.setDate(now.getDate() - 7);
//   }
  
//   current.start.setHours(0, 0, 0, 0);
//   current.end.setHours(23, 59, 59, 999);
//   previous.start.setHours(0, 0, 0, 0);
//   previous.end.setHours(23, 59, 59, 999);
  
//   return { current, previous };
// };

// const getStatsData = async (dateRanges) => {
//   const [
//     currentOrders,
//     previousOrders,
//     users,
//     products,
//     monthRevenue
//   ] = await Promise.all([
//     Order.find({
//       createdAt: { $gte: dateRanges.current.start, $lte: dateRanges.current.end }
//     }),
//     Order.find({
//       createdAt: { $gte: dateRanges.previous.start, $lte: dateRanges.previous.end }
//     }),
//     User.countDocuments({ role: "user" }),
//     Product.countDocuments(),
//     getMonthlyRevenue()
//   ]);

//   const currentRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
//   const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  
//   const currentOrdersCount = currentOrders.length;
//   const previousOrdersCount = previousOrders.length;

//   const revenueChange = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : 0;
//   const ordersChange = previousOrdersCount ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount * 100).toFixed(1) : 0;

//   const currentAvgOrder = currentOrdersCount ? currentRevenue / currentOrdersCount : 0;
//   const previousAvgOrder = previousOrdersCount ? previousRevenue / previousOrdersCount : 0;
//   const avgOrderChange = previousAvgOrder ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder * 100).toFixed(1) : 0;

//   const estimatedVisitors = 5000;
//   const conversionRate = estimatedVisitors ? (currentOrdersCount / estimatedVisitors * 100).toFixed(2) : 0;

//   const monthlyTarget = 500000;

//   return {
//     stats: {
//       revenue: { total: currentRevenue, change: revenueChange, trend: revenueChange >= 0 ? "up" : "down" },
//       orders: { total: currentOrdersCount, change: ordersChange, trend: ordersChange >= 0 ? "up" : "down" },
//       customers: { total: users, change: 8.1, trend: "up" },
//       products: { total: products, change: 2.3, trend: "up" },
//       avgOrderValue: { total: currentAvgOrder, change: avgOrderChange, trend: avgOrderChange >= 0 ? "up" : "down" },
//       conversionRate: { total: conversionRate, change: 0.5, trend: "up" }
//     },
//     monthlyTarget: {
//       achieved: monthRevenue,
//       total: monthlyTarget,
//       percentage: monthlyTarget ? ((monthRevenue / monthlyTarget) * 100).toFixed(1) : 0
//     }
//   };
// };

// const getMonthlyRevenue = async () => {
//   const monthStart = new Date();
//   monthStart.setDate(1);
//   monthStart.setHours(0, 0, 0, 0);
  
//   const monthEnd = new Date();
//   monthEnd.setMonth(monthEnd.getMonth() + 1);
//   monthEnd.setDate(0);
//   monthEnd.setHours(23, 59, 59, 999);

//   const monthOrders = await Order.find({
//     createdAt: { $gte: monthStart, $lte: monthEnd },
//     status: { $ne: "cancelled" }
//   });
  
//   return monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
// };

// const getSalesChartDataQuery = async (range) => {
//   let days = 7;
//   let groupFormat = "%Y-%m-%d";
//   let dateFormat = "day";
  
//   if (range === "month") {
//     days = 30;
//     groupFormat = "%Y-%m-%d";
//     dateFormat = "day";
//   } else if (range === "year") {
//     days = 12;
//     groupFormat = "%Y-%m";
//     dateFormat = "month";
//   }

//   const startDate = new Date();
//   if (range === "year") {
//     startDate.setMonth(startDate.getMonth() - 11);
//     startDate.setDate(1);
//   } else {
//     startDate.setDate(startDate.getDate() - (days - 1));
//   }
//   startDate.setHours(0, 0, 0, 0);

//   const salesData = await Order.aggregate([
//     {
//       $match: {
//         createdAt: { $gte: startDate },
//         status: { $ne: "cancelled" }
//       }
//     },
//     {
//       $group: {
//         _id: {
//           $dateToString: { format: groupFormat, date: "$createdAt" }
//         },
//         sales: { $sum: "$total" },
//         orders: { $sum: 1 }
//       }
//     },
//     { $sort: { "_id": 1 } }
//   ]);

//   const formattedData = [];
//   const today = new Date();
  
//   for (let i = 0; i < days; i++) {
//     const date = new Date();
//     if (range === "year") {
//       date.setMonth(today.getMonth() - (days - 1 - i));
//       date.setDate(1);
//     } else {
//       date.setDate(today.getDate() - (days - 1 - i));
//     }
    
//     let key;
//     let label;
    
//     if (range === "year") {
//       key = date.toISOString().slice(0, 7);
//       label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
//     } else {
//       key = date.toISOString().split('T')[0];
//       label = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
//     }
    
//     const dayData = salesData.find(d => d._id === key) || { sales: 0, orders: 0 };
    
//     formattedData.push({
//       name: label,
//       sales: dayData.sales,
//       orders: dayData.orders
//     });
//   }

//   return formattedData;
// };

// const getTopProductsQuery = async (range, limit) => {
//   const startDate = new Date();
//   if (range === "week") startDate.setDate(startDate.getDate() - 7);
//   else if (range === "month") startDate.setMonth(startDate.getMonth() - 1);
//   else if (range === "year") startDate.setFullYear(startDate.getFullYear() - 1);
  
//   startDate.setHours(0, 0, 0, 0);

//   const topProducts = await Order.aggregate([
//     {
//       $match: {
//         createdAt: { $gte: startDate },
//         status: { $ne: "cancelled" }
//       }
//     },
//     { $unwind: "$items" },
//     {
//       $group: {
//         _id: {
//           productId: "$items.product",
//           name: "$items.name"
//         },
//         quantity: { $sum: "$items.quantity" },
//         revenue: { $sum: "$items.total" },
//         image: { $first: "$items.image" }
//       }
//     },
//     { $sort: { revenue: -1 } },
//     { $limit: limit },
//     {
//       $project: {
//         _id: 0,
//         id: "$_id.productId",
//         name: "$_id.name",
//         quantity: 1,
//         revenue: 1,
//         image: 1
//       }
//     }
//   ]);

//   return topProducts;
// };

// // FIXED: Low stock products query
// const getLowStockProducts = async () => {
//   try {
//     // Get all products
//     const products = await Product.find().select("name stock lowStockThreshold variations");
    
//     const lowStockProducts = [];
    
//     products.forEach(product => {
//       const threshold = product.lowStockThreshold || 10;
      
//       // Check main stock
//       if (product.stock !== undefined && product.stock <= threshold) {
//         lowStockProducts.push({
//           id: product._id,
//           name: product.name,
//           stock: product.stock || 0,
//           threshold: threshold,
//           variations: 0
//         });
//       }
      
//       // Check variations stock
//       if (product.variations && product.variations.length > 0) {
//         let lowStockVariations = 0;
//         product.variations.forEach(variation => {
//           if (variation.stock !== undefined && variation.stock <= threshold) {
//             lowStockVariations++;
//           }
//         });
        
//         if (lowStockVariations > 0) {
//           // Check if product already added from main stock
//           const existingIndex = lowStockProducts.findIndex(p => p.id.toString() === product._id.toString());
          
//           if (existingIndex >= 0) {
//             lowStockProducts[existingIndex].variations = lowStockVariations;
//           } else {
//             lowStockProducts.push({
//               id: product._id,
//               name: product.name,
//               stock: 0,
//               threshold: threshold,
//               variations: lowStockVariations
//             });
//           }
//         }
//       }
//     });
    
//     return lowStockProducts.slice(0, 5);
//   } catch (error) {
//     console.error("Error in getLowStockProducts:", error);
//     return [];
//   }
// };

// const getRecentActivitiesQuery = async () => {
//   try {
//     const [recentOrders, recentProducts, recentUsers] = await Promise.all([
//       Order.find()
//         .sort({ createdAt: -1 })
//         .limit(3)
//         .populate("customer", "name")
//         .select("orderId customer createdAt"),
      
//       Product.find()
//         .sort({ createdAt: -1 })
//         .limit(3)
//         .select("name createdAt"),
      
//       User.find({ role: "user" })
//         .sort({ createdAt: -1 })
//         .limit(3)
//         .select("name createdAt")
//     ]);

//     const activities = [];

//     recentOrders.forEach(order => {
//       activities.push({
//         id: `order-${order._id}`,
//         action: `New order #${order.orderId}`,
//         time: order.createdAt,
//         user: order.customer?.name || "Guest",
//         type: "order",
//         amount: order.total
//       });
//     });

//     recentProducts.forEach(product => {
//       activities.push({
//         id: `product-${product._id}`,
//         action: `Product added: ${product.name}`,
//         time: product.createdAt,
//         user: "Admin",
//         type: "product"
//       });
//     });

//     recentUsers.forEach(user => {
//       activities.push({
//         id: `user-${user._id}`,
//         action: `New user registered`,
//         time: user.createdAt,
//         user: user.name,
//         type: "user"
//       });
//     });

//     activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
//     return activities.slice(0, 5).map(activity => ({
//       ...activity,
//       time: formatTimeAgo(new Date(activity.time))
//     }));
//   } catch (error) {
//     console.error("Error in getRecentActivitiesQuery:", error);
//     return [];
//   }
// };

// const formatTimeAgo = (date) => {
//   const seconds = Math.floor((new Date() - date) / 1000);
  
//   if (seconds < 60) return "just now";
//   const minutes = Math.floor(seconds / 60);
//   if (minutes < 60) return `${minutes} min ago`;
//   const hours = Math.floor(minutes / 60);
//   if (hours < 24) return `${hours} hour ago`;
//   const days = Math.floor(hours / 24);
//   return `${days} day ago`;
// };


const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// @desc    Get all dashboard data in one call
// @route   GET /api/dashboard
// @access  Private/Admin
exports.getDashboardData = async (req, res) => {
  try {
    const { range = "week" } = req.query;
    
    // Get date ranges
    const dateRanges = getDateRanges(range);
    
    // Run all queries in parallel
    const [
      stats,
      salesChart,
      topProducts,
      recentOrders,
      orderStatus,
      paymentMethods,
      lowStock,
      recentActivities
    ] = await Promise.all([
      getStatsData(dateRanges),
      getSalesChartDataQuery(range),
      getTopProductsQuery(range, 5),
      getRecentOrdersQuery(5),
      getOrderStatusQuery(),
      getPaymentMethodQuery(dateRanges.current),
      getLowStockProducts(),
      getRecentActivitiesQuery()
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: stats.stats,
        monthlyTarget: stats.monthlyTarget,
        salesData: salesChart,
        topProducts,
        recentOrders,
        orderStatusData: orderStatus,
        paymentMethodData: paymentMethods,
        lowStockProducts: lowStock,
        recentActivities
      }
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message
    });
  }
};

// Helper Functions
const getDateRanges = (range) => {
  const now = new Date();
  const current = { start: new Date(), end: new Date() };
  const previous = { start: new Date(), end: new Date() };
  
  switch(range) {
    case "day":
      current.start.setDate(now.getDate() - 1);
      previous.start.setDate(now.getDate() - 2);
      previous.end.setDate(now.getDate() - 1);
      break;
    case "week":
      current.start.setDate(now.getDate() - 7);
      previous.start.setDate(now.getDate() - 14);
      previous.end.setDate(now.getDate() - 7);
      break;
    case "month":
      current.start.setMonth(now.getMonth() - 1);
      previous.start.setMonth(now.getMonth() - 2);
      previous.end.setMonth(now.getMonth() - 1);
      break;
    case "year":
      current.start.setFullYear(now.getFullYear() - 1);
      previous.start.setFullYear(now.getFullYear() - 2);
      previous.end.setFullYear(now.getFullYear() - 1);
      break;
    default:
      current.start.setDate(now.getDate() - 7);
      previous.start.setDate(now.getDate() - 14);
      previous.end.setDate(now.getDate() - 7);
  }
  
  current.start.setHours(0, 0, 0, 0);
  current.end.setHours(23, 59, 59, 999);
  previous.start.setHours(0, 0, 0, 0);
  previous.end.setHours(23, 59, 59, 999);
  
  return { current, previous };
};

const getStatsData = async (dateRanges) => {
  try {
    // Current period orders
  const currentOrders = await Order.find({
    createdAt: { $gte: dateRanges.current.start, $lte: dateRanges.current.end }
  });
  
  // Previous period orders
  const previousOrders = await Order.find({
    createdAt: { $gte: dateRanges.previous.start, $lte: dateRanges.previous.end }
  });
  
  // Total users and products
  const totalUsers = await User.countDocuments({ role: "user" });
  const totalProducts = await Product.countDocuments();

  // Calculate current period stats
  const currentRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const currentOrdersCount = currentOrders.length;
  
  // Calculate previous period stats
  const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const previousOrdersCount = previousOrders.length;

  // Calculate changes
  const revenueChange = previousRevenue 
    ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) 
    : 0;
  const ordersChange = previousOrdersCount 
    ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount * 100).toFixed(1) 
    : 0;

  // Calculate average order value
  const currentAvgOrder = currentOrdersCount ? currentRevenue / currentOrdersCount : 0;
  const previousAvgOrder = previousOrdersCount ? previousRevenue / previousOrdersCount : 0;
  const avgOrderChange = previousAvgOrder 
    ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder * 100).toFixed(1) 
    : 0;

  // Conversion rate (example calculation)
  const totalVisitors = 1000; // You can get this from analytics
  const conversionRate = totalVisitors ? (currentOrdersCount / totalVisitors * 100).toFixed(2) : 0;

  // Monthly target
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);

  const monthOrders = await Order.find({
    createdAt: { $gte: monthStart, $lte: monthEnd },
    status: { $ne: "cancelled" }
  });
  
  const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const monthlyTarget = 5000000; // 50 लाख

  return {
    stats: {
      revenue: {
        total: currentRevenue,
        change: revenueChange,
        trend: revenueChange >= 0 ? "up" : "down"
      },
      orders: {
        total: currentOrdersCount,
        change: ordersChange,
        trend: ordersChange >= 0 ? "up" : "down"
      },
      customers: {
        total: totalUsers,
        change: 8.1,
        trend: "up"
      },
      products: {
        total: totalProducts,
        change: 2.3,
        trend: "up"
      },
      avgOrderValue: {
        total: currentAvgOrder,
        change: avgOrderChange,
        trend: avgOrderChange >= 0 ? "up" : "down"
      },
      conversionRate: {
        total: parseFloat(conversionRate),
        change: 0.5,
        trend: "up"
      }
    },
    monthlyTarget: {
      achieved: monthRevenue,
      total: monthlyTarget,
      percentage: monthlyTarget ? ((monthRevenue / monthlyTarget) * 100).toFixed(1) : 0
    }
  };
  } catch (error) {
    console.error("Error in getStatsData:", error);
    return {
      stats: {
        revenue: { total: 0, change: 0, trend: "up" },
        orders: { total: 0, change: 0, trend: "up" },
        customers: { total: 0, change: 0, trend: "up" },
        products: { total: 0, change: 0, trend: "up" },
        avgOrderValue: { total: 0, change: 0, trend: "up" },
        conversionRate: { total: 0, change: 0, trend: "up" }
      },
      monthlyTarget: { achieved: 0, total: 5000000, percentage: 0 }
    };
  }
};

const getSalesChartDataQuery = async (range) => {
  try {
    let days = 7;
    let groupFormat = "%Y-%m-%d";
    
    if (range === "month") {
      days = 30;
    } else if (range === "year") {
      days = 12;
      groupFormat = "%Y-%m";
    }

    const startDate = new Date();
    if (range === "year") {
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    } else {
      startDate.setDate(startDate.getDate() - (days - 1));
    }
    startDate.setHours(0, 0, 0, 0);

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: "$createdAt" }
          },
          sales: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const formattedData = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      if (range === "year") {
        date.setMonth(today.getMonth() - (days - 1 - i));
        date.setDate(1);
      } else {
        date.setDate(today.getDate() - (days - 1 - i));
      }
      
      let key;
      let label;
      
      if (range === "year") {
        key = date.toISOString().slice(0, 7);
        label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      } else {
        key = date.toISOString().split('T')[0];
        label = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      }
      
      const dayData = salesData.find(d => d._id === key) || { sales: 0, orders: 0 };
      
      formattedData.push({
        name: label,
        sales: dayData.sales,
        orders: dayData.orders
      });
    }

    return formattedData;
  } catch (error) {
    console.error("Error in getSalesChartDataQuery:", error);
    return [];
  }
};

const getTopProductsQuery = async (range, limit) => {
  try {
    const startDate = new Date();
    if (range === "week") startDate.setDate(startDate.getDate() - 7);
    else if (range === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (range === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    
    startDate.setHours(0, 0, 0, 0);

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            productId: "$items.product",
            name: "$items.name"
          },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.total" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $project: {
          id: "$_id.productId",
          name: "$_id.name",
          quantity: 1,
          revenue: 1
        }
      }
    ]);

    return topProducts;
  } catch (error) {
    console.error("Error in getTopProductsQuery:", error);
    return [];
  }
};

const getRecentOrdersQuery = async (limit) => {
  try {
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("customer", "name email")
      .select("orderId customer total status paymentStatus createdAt items");

    return recentOrders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      customer: order.customer,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      itemsCount: order.items?.length || 0
    }));
  } catch (error) {
    console.error("Error in getRecentOrdersQuery:", error);
    return [];
  }
};

const getOrderStatusQuery = async () => {
  try {
    const orderStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    
    const statusColors = {
      pending: "#F59E0B",
      confirmed: "#3B82F6",
      processing: "#8B5CF6",
      shipped: "#6366F1",
      delivered: "#10B981",
      cancelled: "#EF4444",
      returned: "#6B7280"
    };

    return orderStatus.map(item => ({
      status: item._id || "unknown",
      count: item.count,
      percentage: totalOrders ? ((item.count / totalOrders) * 100).toFixed(1) : 0,
      color: statusColors[item._id] || "#6B7280"
    }));
  } catch (error) {
    console.error("Error in getOrderStatusQuery:", error);
    return [];
  }
};

const getPaymentMethodQuery = async (dateRange) => {
  try {
    const paymentMethods = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$total" }
        }
      }
    ]);

    const methodNames = {
      razorpay: "Razorpay",
      cash_on_delivery: "COD",
      card: "Card",
      upi: "UPI",
      netbanking: "NetBanking"
    };

    return paymentMethods.map(item => ({
      name: methodNames[item._id] || item._id?.replace(/_/g, " ").toUpperCase() || "Other",
      value: item.count,
      total: item.total
    }));
  } catch (error) {
    console.error("Error in getPaymentMethodQuery:", error);
    return [];
  }
};

const getLowStockProducts = async () => {
  try {
    // सारे प्रोडक्ट्स लो करो
    const products = await Product.find().select("name stock lowStockThreshold variations");
    
    const lowStockProducts = [];
    
    for (const product of products) {
      const threshold = product.lowStockThreshold || 10;
      
      // मेन स्टॉक चेक करो
      if (product.stock !== undefined && product.stock <= threshold && product.stock > 0) {
        lowStockProducts.push({
          id: product._id,
          name: product.name,
          stock: product.stock || 0,
          threshold: threshold,
          variations: 0
        });
      }
      
      // वेरिएशन्स चेक करो
      if (product.variations && product.variations.length > 0) {
        let lowStockVariations = 0;
        
        product.variations.forEach(variation => {
          if (variation.stock !== undefined && variation.stock <= threshold && variation.stock > 0) {
            lowStockVariations++;
          }
        });
        
        if (lowStockVariations > 0) {
          // Check if product already added
          const existingIndex = lowStockProducts.findIndex(p => p.id.toString() === product._id.toString());
          
          if (existingIndex >= 0) {
            lowStockProducts[existingIndex].variations = lowStockVariations;
          } else {
            lowStockProducts.push({
              id: product._id,
              name: product.name,
              stock: 0,
              threshold: threshold,
              variations: lowStockVariations
            });
          }
        }
      }
    }
    
    // Out of stock products (stock = 0) भी दिखाओ
    const outOfStockProducts = await Product.find({
      $or: [
        { stock: 0 },
        { "variations.stock": 0 }
      ]
    }).select("name stock lowStockThreshold variations").limit(5);
    
    outOfStockProducts.forEach(product => {
      const existingIndex = lowStockProducts.findIndex(p => p.id.toString() === product._id.toString());
      
      if (existingIndex === -1) {
        if (product.stock === 0) {
          lowStockProducts.push({
            id: product._id,
            name: product.name,
            stock: 0,
            threshold: product.lowStockThreshold || 10,
            variations: 0
          });
        } else {
          // Count variations with 0 stock
          const zeroStockVariations = product.variations.filter(v => v.stock === 0).length;
          if (zeroStockVariations > 0) {
            lowStockProducts.push({
              id: product._id,
              name: product.name,
              stock: product.stock || 0,
              threshold: product.lowStockThreshold || 10,
              variations: zeroStockVariations
            });
          }
        }
      }
    });
    
    return lowStockProducts.slice(0, 5);
  } catch (error) {
    console.error("Error in getLowStockProducts:", error);
    return [];
  }
};

const getRecentActivitiesQuery = async () => {
  try {
    const activities = [];

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("customer", "name")
      .select("orderId customer createdAt total");

    recentOrders.forEach(order => {
      activities.push({
        id: `order-${order._id}`,
        action: `New order #${order.orderId}`,
        time: order.createdAt,
        user: order.customer?.name || "Guest",
        type: "order",
        amount: order.total
      });
    });

    // Recent products
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name createdAt");

    recentProducts.forEach(product => {
      activities.push({
        id: `product-${product._id}`,
        action: `Product added: ${product.name}`,
        time: product.createdAt,
        user: "Admin",
        type: "product"
      });
    });

    // Recent users
    const recentUsers = await User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name createdAt");

    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user._id}`,
        action: `New user registered`,
        time: user.createdAt,
        user: user.name,
        type: "user"
      });
    });

    // Sort by time (newest first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Format time
    return activities.slice(0, 5).map(activity => ({
      ...activity,
      time: formatTimeAgo(new Date(activity.time))
    }));
  } catch (error) {
    console.error("Error in getRecentActivitiesQuery:", error);
    return [];
  }
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week ago`;
};

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const { range = "week" } = req.query;
    const dateRanges = getDateRanges(range);
    
    const stats = await getStatsData(dateRanges);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message
    });
  }
};

// @desc    Get sales chart data
// @route   GET /api/dashboard/sales-chart
// @access  Private/Admin
exports.getSalesChartData = async (req, res) => {
  try {
    const { range = "week" } = req.query;
    
    const salesData = await getSalesChartDataQuery(range);

    res.status(200).json({
      success: true,
      data: salesData
    });
  } catch (error) {
    console.error("Sales chart error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sales chart data",
      error: error.message
    });
  }
};

// @desc    Get top products
// @route   GET /api/dashboard/top-products
// @access  Private/Admin
exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 5, range = "week" } = req.query;
    
    const topProducts = await getTopProductsQuery(range, parseInt(limit));

    res.status(200).json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching top products",
      error: error.message
    });
  }
};

// @desc    Get recent orders
// @route   GET /api/dashboard/recent-orders
// @access  Private/Admin
exports.getRecentOrders = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentOrders = await getRecentOrdersQuery(parseInt(limit));

    res.status(200).json({
      success: true,
      data: recentOrders
    });
  } catch (error) {
    console.error("Recent orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent orders",
      error: error.message
    });
  }
};

// @desc    Get order status distribution
// @route   GET /api/dashboard/order-status
// @access  Private/Admin
exports.getOrderStatus = async (req, res) => {
  try {
    const orderStatus = await getOrderStatusQuery();

    res.status(200).json({
      success: true,
      data: orderStatus
    });
  } catch (error) {
    console.error("Order status error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order status",
      error: error.message
    });
  }
};

// @desc    Get payment method distribution
// @route   GET /api/dashboard/payment-methods
// @access  Private/Admin
exports.getPaymentMethods = async (req, res) => {
  try {
    const { range = "week" } = req.query;
    const dateRanges = getDateRanges(range);
    
    const paymentMethods = await getPaymentMethodQuery(dateRanges.current);

    res.status(200).json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error("Payment methods error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment methods",
      error: error.message
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/dashboard/low-stock
// @access  Private/Admin
exports.getLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await getLowStockProducts();

    res.status(200).json({
      success: true,
      data: lowStockProducts
    });
  } catch (error) {
    console.error("Low stock error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching low stock products",
      error: error.message
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/dashboard/recent-activities
// @access  Private/Admin
exports.getRecentActivities = async (req, res) => {
  try {
    const activities = await getRecentActivitiesQuery();

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error("Recent activities error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent activities",
      error: error.message
    });
  }
};
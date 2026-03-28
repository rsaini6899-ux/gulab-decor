const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    // Today's date for comparison
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));
    
    // Current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Previous month
    const startOfPrevMonth = new Date(startOfMonth);
    startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
    const endOfPrevMonth = new Date(startOfMonth);
    endOfPrevMonth.setDate(0);
    endOfPrevMonth.setHours(23, 59, 59, 999);
    
    // 1. Revenue Stats
    const revenueStats = await Order.aggregate([
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          yesterday: [
            { $match: { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          allTime: [
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ]
        }
      }
    ]);
    
    // 2. Customer Stats
    const customerStats = await Customer.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          newThisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: 'count' }
          ],
          active: [
            { $match: { status: 'active' } },
            { $count: 'count' }
          ]
        }
      }
    ]);
    
    // 3. Product Stats
    const productStats = await Product.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [
            { $match: { status: 'active' } },
            { $count: 'count' }
          ],
          outOfStock: [
            { $match: { status: 'out_of_stock' } },
            { $count: 'count' }
          ],
          lowStock: [
            { $match: { stock: { $lte: 10 }, trackInventory: true } },
            { $count: 'count' }
          ]
        }
      }
    ]);
    
    // 4. Order Status Distribution
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      }
    ]);
    
    // 5. Daily Sales for Chart (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // 6. Top Selling Products
    const topProducts = await Product.find()
      .sort({ sold: -1 })
      .limit(5)
      .select('name sku sold price stock images');
    
    // 7. Recent Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'firstName lastName email')
      .select('orderId customer total status createdAt');
    
    // Calculate percentage changes
    const todayRevenue = revenueStats[0].today[0]?.revenue || 0;
    const yesterdayRevenue = revenueStats[0].yesterday[0]?.revenue || 0;
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : 0;
    
    const thisMonthRevenue = revenueStats[0].thisMonth[0]?.revenue || 0;
    const lastMonthRevenue = revenueStats[0].lastMonth[0]?.revenue || 0;
    const monthlyRevenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        revenue: {
          today: todayRevenue,
          thisMonth: thisMonthRevenue,
          allTime: revenueStats[0].allTime[0]?.revenue || 0,
          change: revenueChange,
          monthlyChange: monthlyRevenueChange
        },
        orders: {
          today: revenueStats[0].today[0]?.orders || 0,
          thisMonth: revenueStats[0].thisMonth[0]?.orders || 0,
          allTime: revenueStats[0].allTime[0]?.orders || 0
        },
        customers: {
          total: customerStats[0].total[0]?.count || 0,
          newThisMonth: customerStats[0].newThisMonth[0]?.count || 0,
          active: customerStats[0].active[0]?.count || 0
        },
        products: {
          total: productStats[0].total[0]?.count || 0,
          active: productStats[0].active[0]?.count || 0,
          outOfStock: productStats[0].outOfStock[0]?.count || 0,
          lowStock: productStats[0].lowStock[0]?.count || 0
        },
        orderStatus: orderStatusStats,
        dailySales,
        topProducts,
        recentOrders,
        averageOrderValue: revenueStats[0].allTime[0]?.orders > 0
          ? (revenueStats[0].allTime[0].revenue / revenueStats[0].allTime[0].orders).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let groupFormat = '%Y-%m';
    let dateFormat = 'MMM YYYY';
    
    switch (period) {
      case 'day':
        groupFormat = '%Y-%m-%d';
        dateFormat = 'MMM DD, YYYY';
        break;
      case 'week':
        groupFormat = '%Y-%U';
        dateFormat = 'Week %U, YYYY';
        break;
      case 'year':
        groupFormat = '%Y';
        dateFormat = 'YYYY';
        break;
    }
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    // Sales over time
    const salesOverTime = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Sales by payment method
    const salesByPaymentMethod = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      }
    ]);
    
    // Sales by status
    const salesByStatus = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      }
    ]);
    
    // Top selling products
    const topSellingProducts = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate product details
    for (const product of topSellingProducts) {
      if (product._id) {
        const productDetails = await Product.findById(product._id);
        if (productDetails) {
          product.image = productDetails.images[0]?.url;
          product.price = productDetails.price;
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        period,
        dateFormat,
        salesOverTime,
        salesByPaymentMethod,
        salesByStatus,
        topSellingProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerAnalytics = async (req, res, next) => {
  try {
    // Customer acquisition over time
    const acquisitionOverTime = await Customer.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Customer lifetime value distribution
    const clvDistribution = await Customer.aggregate([
      {
        $bucket: {
          groupBy: '$totalSpent',
          boundaries: [0, 100, 500, 1000, 5000, 10000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            averageSpent: { $avg: '$totalSpent' }
          }
        }
      }
    ]);
    
    // Repeat customer rate
    const totalCustomers = await Customer.countDocuments();
    const repeatCustomers = await Customer.countDocuments({
      totalOrders: { $gt: 1 }
    });
    const repeatCustomerRate = totalCustomers > 0 
      ? (repeatCustomers / totalCustomers * 100).toFixed(1)
      : 0;
    
    // Customer retention cohorts
    const cohorts = await Order.aggregate([
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            customer: '$customer'
          }
        }
      },
      {
        $group: {
          _id: '$_id.month',
          customers: { $push: '$_id.customer' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 6 }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        acquisitionOverTime,
        clvDistribution,
        repeatCustomerRate,
        cohorts,
        totalCustomers,
        repeatCustomers
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductAnalytics = async (req, res, next) => {
  try {
    // Product performance
    const productPerformance = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalSold: { $sum: '$sold' },
          totalRevenue: { 
            $sum: { $multiply: ['$price', '$sold'] } 
          },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    // Populate category names
    const Category = require('../models/category.model');
    for (const item of productPerformance) {
      if (item._id) {
        const category = await Category.findById(item._id);
        item.categoryName = category ? category.name : 'Uncategorized';
      }
    }
    
    // Stock analysis
    const stockAnalysis = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          averageStock: { $avg: '$stock' },
          lowStockCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $lte: ['$stock', 10] },
                  { $eq: ['$trackInventory', true] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Product status distribution
    const statusDistribution = await Product.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        productPerformance,
        stockAnalysis: stockAnalysis[0] || {
          totalValue: 0,
          averageStock: 0,
          lowStockCount: 0
        },
        statusDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTrafficAnalytics = async (req, res, next) => {
  try {
    // Note: In a real app, you would use Google Analytics API or similar
    // This is mock data for demonstration
    
    const trafficSources = [
      { source: 'Direct', visits: 3567, conversion: 4.2 },
      { source: 'Organic Search', visits: 2456, conversion: 3.8 },
      { source: 'Social Media', visits: 1987, conversion: 2.5 },
      { source: 'Email', visits: 1234, conversion: 5.8 },
      { source: 'Referral', visits: 876, conversion: 3.2 },
      { source: 'Paid Ads', visits: 654, conversion: 6.1 }
    ];
    
    const deviceDistribution = [
      { device: 'Desktop', percentage: 58 },
      { device: 'Mobile', percentage: 38 },
      { device: 'Tablet', percentage: 4 }
    ];
    
    const geographicDistribution = [
      { country: 'United States', visitors: 1245 },
      { country: 'United Kingdom', visitors: 567 },
      { country: 'Canada', visitors: 342 },
      { country: 'Australia', visitors: 234 },
      { country: 'Germany', visitors: 189 }
    ];
    
    const bounceRate = 42.5;
    const avgSessionDuration = '3:45';
    const pagesPerSession = 4.2;
    
    res.status(200).json({
      success: true,
      data: {
        trafficSources,
        deviceDistribution,
        geographicDistribution,
        bounceRate,
        avgSessionDuration,
        pagesPerSession
      }
    });
  } catch (error) {
    next(error);
  }
};
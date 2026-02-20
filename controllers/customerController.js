const Customer = require('../models/Customer');
const Order = require('../models/Order');
const APIFeatures = require('../utils/APIFeatures');

exports.getAllCustomers = async (req, res, next) => {
  try {
    const features = new APIFeatures(Customer.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    
    const customers = await features.query;
    
    const total = await Customer.countDocuments(features.filterQuery);
    
    // Get summary stats
    const stats = await Customer.aggregate([
      { $match: features.filterQuery },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          averageOrderValue: { $avg: '$averageOrderValue' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      summary: stats[0] || {
        totalCustomers: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      },
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        pages: Math.ceil(total / (req.query.limit || 10))
      },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Get customer orders
    const orders = await Order.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderId total status createdAt');
    
    res.status(200).json({
      success: true,
      data: {
        ...customer.toObject(),
        recentOrders: orders
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer already exists'
      });
    }
    
    const customer = await Customer.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    let customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== customer.email) {
      const existingCustomer = await Customer.findOne({ email: req.body.email });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Check if customer has orders
    const orderCount = await Order.countDocuments({ customer: customer._id });
    if (orderCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Customer has ${orderCount} orders. Use force=true to delete anyway.`
      });
    }
    
    await customer.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    customer.addresses.push(req.body);
    await customer.save();
    
    res.status(200).json({
      success: true,
      message: 'Address added successfully',
      data: customer.addresses
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const addressIndex = customer.addresses.findIndex(
      addr => addr._id.toString() === req.params.addressId
    );
    
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    customer.addresses[addressIndex] = {
      ...customer.addresses[addressIndex].toObject(),
      ...req.body
    };
    
    await customer.save();
    
    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: customer.addresses[addressIndex]
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    customer.addresses = customer.addresses.filter(
      addr => addr._id.toString() !== req.params.addressId
    );
    
    await customer.save();
    
    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: customer.addresses
    });
  } catch (error) {
    next(error);
  }
};

exports.addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    customer.notes.push({
      note,
      createdBy: req.user.id
    });
    
    await customer.save();
    
    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: customer.notes
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const features = new APIFeatures(
      Order.find({ customer: customer._id }),
      req.query
    )
      .filter()
      .sort()
      .paginate();
    
    const orders = await features.query
      .select('orderId total status paymentStatus createdAt');
    
    const total = await Order.countDocuments({ 
      customer: customer._id,
      ...features.filterQuery
    });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerStats = async (req, res, next) => {
  try {
    // Customer segmentation
    const segmentation = await Customer.aggregate([
      {
        $bucket: {
          groupBy: '$totalSpent',
          boundaries: [0, 100, 500, 1000, 5000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalRevenue: { $sum: '$totalSpent' }
          }
        }
      }
    ]);
    
    // New customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Active customers (ordered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeCustomers = await Order.distinct('customer', {
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // VIP customers (spent > $1000)
    const vipCustomers = await Customer.countDocuments({
      totalSpent: { $gte: 1000 }
    });
    
    // At-risk customers (no orders in 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const customersWithRecentOrders = await Order.distinct('customer', {
      createdAt: { $gte: ninetyDaysAgo }
    });
    
    const atRiskCustomers = await Customer.countDocuments({
      _id: { $nin: customersWithRecentOrders },
      totalOrders: { $gt: 0 }
    });
    
    res.status(200).json({
      success: true,
      data: {
        segmentation,
        newCustomers,
        activeCustomers: activeCustomers.length,
        vipCustomers,
        atRiskCustomers,
        totalCustomers: await Customer.countDocuments()
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search query'
      });
    }
    
    const customers = await Customer.find({
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);
    
    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    next(error);
  }
};
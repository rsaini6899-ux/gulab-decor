const Settings = require('../models/Settings');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.getSettings();
    
    // Update settings
    settings = await Settings.findOneAndUpdate(
      { _id: settings._id },
      {
        ...req.body,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStoreSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    settings.store = {
      ...settings.store.toObject(),
      ...req.body
    };
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Store settings updated successfully',
      data: settings.store
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    settings.payment = {
      ...settings.payment.toObject(),
      ...req.body
    };
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings.payment
    });
  } catch (error) {
    next(error);
  }
};

exports.updateShippingSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    settings.shipping = {
      ...settings.shipping.toObject(),
      ...req.body
    };
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Shipping settings updated successfully',
      data: settings.shipping
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEmailSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    settings.email = {
      ...settings.email.toObject(),
      ...req.body
    };
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      data: settings.email
    });
  } catch (error) {
    next(error);
  }
};

exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    settings.notifications = {
      ...settings.notifications.toObject(),
      ...req.body
    };
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settings.notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.testEmailConfig = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }
    
    // In real app, send test email using nodemailer
    // This is mock response
    
    res.status(200).json({
      success: true,
      message: `Test email sent to ${email} successfully`
    });
  } catch (error) {
    next(error);
  }
};

exports.clearCache = async (req, res, next) => {
  try {
    // In real app, clear Redis cache or similar
    // This is mock response
    
    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.backupDatabase = async (req, res, next) => {
  try {
    // In real app, create database backup
    // This is mock response
    
    const backupUrl = `https://backup.example.com/backup-${Date.now()}.zip`;
    
    res.status(200).json({
      success: true,
      message: 'Database backup created successfully',
      data: {
        backupUrl,
        timestamp: new Date().toISOString(),
        size: '245 MB'
      }
    });
  } catch (error) {
    next(error);
  }
};
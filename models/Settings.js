const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: true,
    default: 'E-commerce Store'
  },
  storeEmail: {
    type: String,
    required: true,
    default: 'support@store.com'
  },
  storePhone: String,
  storeAddress: String,
  storeLogo: {
    public_id: String,
    url: String
  },
  storeFavicon: {
    public_id: String,
    url: String
  },
  storeCurrency: {
    type: String,
    default: 'USD'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  storeLanguage: {
    type: String,
    default: 'en'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: String
});

const paymentSettingsSchema = new mongoose.Schema({
  stripeEnabled: {
    type: Boolean,
    default: false
  },
  stripePublicKey: String,
  stripeSecretKey: String,
  stripeWebhookSecret: String,
  paypalEnabled: {
    type: Boolean,
    default: false
  },
  paypalClientId: String,
  paypalSecret: String,
  codEnabled: {
    type: Boolean,
    default: true
  },
  bankTransferEnabled: {
    type: Boolean,
    default: false
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    iban: String,
    swiftCode: String
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currency: {
    type: String,
    default: 'USD'
  },
  currencyPosition: {
    type: String,
    enum: ['left', 'right'],
    default: 'left'
  },
  thousandSeparator: {
    type: String,
    default: ','
  },
  decimalSeparator: {
    type: String,
    default: '.'
  },
  decimalPlaces: {
    type: Number,
    default: 2,
    min: 0,
    max: 4
  }
});

const shippingSettingsSchema = new mongoose.Schema({
  methods: [{
    name: String,
    cost: Number,
    description: String,
    minOrder: Number,
    maxOrder: Number,
    estimatedDays: String,
    enabled: Boolean,
    countries: [String]
  }],
  zones: [{
    name: String,
    countries: [String],
    rates: [{
      method: String,
      cost: Number,
      conditions: mongoose.Schema.Types.Mixed
    }]
  }],
  defaultMethod: String,
  freeShippingThreshold: Number,
  weightUnit: {
    type: String,
    enum: ['kg', 'lb', 'g', 'oz'],
    default: 'kg'
  },
  dimensionUnit: {
    type: String,
    enum: ['cm', 'in', 'm', 'ft'],
    default: 'cm'
  }
});

const emailSettingsSchema = new mongoose.Schema({
  smtpHost: String,
  smtpPort: Number,
  smtpUsername: String,
  smtpPassword: String,
  fromEmail: String,
  fromName: String,
  replyTo: String,
  orderConfirmation: {
    type: Boolean,
    default: true
  },
  shippingUpdate: {
    type: Boolean,
    default: true
  },
  newsletter: {
    type: Boolean,
    default: true
  },
  customerWelcome: {
    type: Boolean,
    default: true
  },
  abandonedCart: {
    type: Boolean,
    default: false
  },
  abandonedCartDelay: {
    type: Number,
    default: 24
  }
});

const notificationSettingsSchema = new mongoose.Schema({
  emailNotifications: {
    newOrder: { type: Boolean, default: true },
    lowStock: { type: Boolean, default: true },
    customerRegistration: { type: Boolean, default: true },
    orderShipped: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true }
  },
  pushNotifications: {
    newOrder: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    inventoryAlert: { type: Boolean, default: false }
  },
  adminNotifications: {
    dailyReport: { type: Boolean, default: false },
    weeklyReport: { type: Boolean, default: true },
    monthlyReport: { type: Boolean, default: true }
  },
  reportEmail: String
});

const seoSettingsSchema = new mongoose.Schema({
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  ogImage: {
    public_id: String,
    url: String
  },
  twitterHandle: String,
  facebookPixel: String,
  googleAnalytics: String,
  robotsTxt: String
});

const settingsSchema = new mongoose.Schema({
  store: storeSettingsSchema,
  payment: paymentSettingsSchema,
  shipping: shippingSettingsSchema,
  email: emailSettingsSchema,
  notifications: notificationSettingsSchema,
  seo: seoSettingsSchema,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create default settings if none exist
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
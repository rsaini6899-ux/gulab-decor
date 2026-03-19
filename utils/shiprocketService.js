// const axios = require('axios');
// const Shiprocket = require('../models/shiprocket');

// class ShiprocketService {
//   constructor() {
//     this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
//     this.token = null;
//     this.tokenExpiry = null;
//   }

//   // Get active Shiprocket settings from DB
//   async getSettings() {
//     const settings = await Shiprocket.findOne({ isEnabled: true }).sort({ createdAt: -1 });
//     console.log('Fetched Shiprocket settings:', settings);
//     if (!settings) {
//       throw new Error('Shiprocket not configured');
//     }
//     return settings;
//   }

//   // Get auth token (with caching)
//   async getToken() {
//     // Check if token is valid
//     if (this.token && this.tokenExpiry && this.tokenExpiry > Date.now()) {
//       return this.token;
//     }

//     const settings = await this.getSettings();
//     console.log('Using Shiprocket settings for auth:', settings);

//     try {
//       const response = await axios.post(`${this.baseURL}/auth/login`, {
//         email: settings.email,
//         password: settings.password // This is encrypted in DB
//       });

//       console.log('Shiprocket login response:', response.data);

//       if (response.data && response.data.token) {
//         this.token = response.data.token;
//         this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000); // 23 hours (Shiprocket token expires in 24h)
        
//         // Update token in DB
//         settings.apiToken = response.data.token;
//         await settings.save();
        
//         return this.token;
//       }
//     } catch (error) {
//       console.error('Shiprocket login failed:', error.response?.data || error.message);
//       throw new Error('Failed to authenticate with Shiprocket');
//     }
//   }

//   // Create shipment
//   async createShipment(orderData) {
//     const token = await this.getToken();
//     const settings = await this.getSettings();

//     const payload = {
//       order_id: orderData.orderId,
//       order_date: new Date().toISOString().split('T')[0],
//       pickup_location: settings.pickupLocation.name || 'Primary',
//       channel_id: settings.channelId || '',
//       comment: 'Order from Store',
//       billing_customer_name: orderData.shippingAddress.fullName,
//       billing_last_name: '',
//       billing_address: orderData.shippingAddress.address,
//       billing_address_2: orderData.shippingAddress.landmark || '',
//       billing_city: orderData.shippingAddress.city,
//       billing_pincode: orderData.shippingAddress.pincode,
//       billing_state: orderData.shippingAddress.state,
//       billing_country: orderData.shippingAddress.country || 'India',
//       billing_email: orderData.shippingAddress.email,
//       billing_phone: orderData.shippingAddress.phone,
//       shipping_is_billing: true,
//       shipping_customer_name: orderData.shippingAddress.fullName,
//       shipping_last_name: '',
//       shipping_address: orderData.shippingAddress.address,
//       shipping_address_2: orderData.shippingAddress.landmark || '',
//       shipping_city: orderData.shippingAddress.city,
//       shipping_pincode: orderData.shippingAddress.pincode,
//       shipping_state: orderData.shippingAddress.state,
//       shipping_country: orderData.shippingAddress.country || 'India',
//       shipping_email: orderData.shippingAddress.email,
//       shipping_phone: orderData.shippingAddress.phone,
//       order_items: orderData.items.map(item => ({
//         name: item.name,
//         sku: item.sku || `SKU-${item.product}`,
//         units: item.quantity,
//         selling_price: item.price,
//         discount: '',
//         tax: '',
//         hsn: 441122
//       })),
//       payment_method: orderData.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Prepaid',
//       shipping_charges: orderData.shipping,
//       giftwrap_charges: 0,
//       transaction_charges: 0,
//       total_discount: orderData.discountAmount || 0,
//       sub_total: orderData.subtotal,
//       length: 10,
//       breadth: 10,
//       height: 10,
//       weight: 0.5
//     };

//     try {
//       const response = await axios.post(`${this.baseURL}/orders/create/adhoc`, payload, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       return response.data;
//     } catch (error) {
//       console.error('Shiprocket shipment creation failed:', error.response?.data || error.message);
//       throw new Error(error.response?.data?.message || 'Failed to create shipment');
//     }
//   }

//   // Generate label
//   async generateLabel(shipmentId) {
//     const token = await this.getToken();

//     try {
//       const response = await axios.post(`${this.baseURL}/courier/generate/label`, {
//         shipment_id: shipmentId
//       }, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       return response.data;
//     } catch (error) {
//       console.error('Label generation failed:', error.response?.data || error.message);
//       throw new Error('Failed to generate label');
//     }
//   }

//   // Generate manifest
//   async generateManifest(shipmentIds) {
//     const token = await this.getToken();

//     try {
//       const response = await axios.post(`${this.baseURL}/manifests`, {
//         shipment_id: shipmentIds
//       }, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       return response.data;
//     } catch (error) {
//       console.error('Manifest generation failed:', error.response?.data || error.message);
//       throw new Error('Failed to generate manifest');
//     }
//   }

//   // Track shipment
//   async trackShipment(awbCode) {
//     const token = await this.getToken();

//     try {
//       const response = await axios.get(`${this.baseURL}/courier/track/awb/${awbCode}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       return response.data;
//     } catch (error) {
//       console.error('Tracking failed:', error.response?.data || error.message);
//       throw new Error('Failed to track shipment');
//     }
//   }

//   // Cancel shipment
//   async cancelShipment(shipmentId) {
//     const token = await this.getToken();

//     try {
//       const response = await axios.post(`${this.baseURL}/orders/cancel`, {
//         shipment_id: shipmentId
//       }, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       return response.data;
//     } catch (error) {
//       console.error('Cancellation failed:', error.response?.data || error.message);
//       throw new Error('Failed to cancel shipment');
//     }
//   }
// }

// module.exports = new ShiprocketService();



const axios = require('axios');
const Shiprocket = require('../models/shiprocket');
const bcrypt = require('bcryptjs');

class ShiprocketService {
  constructor() {
    this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiry = null;
  }

  // Get active Shiprocket settings from DB
  async getSettings() {
    const settings = await Shiprocket.findOne({ isEnabled: true }).sort({ createdAt: -1 });
    console.log('Fetched Shiprocket settings:', {
      email: settings?.email,
      isEnabled: settings?.isEnabled,
      hasPassword: !!settings?.password,
      hasToken: !!settings?.apiToken,
      lastTokenRefresh: settings?.lastTokenRefresh
    });
    
    if (!settings) {
      throw new Error('Shiprocket not configured');
    }
    return settings;
  }

  // ==================== TOKEN MANAGEMENT ====================
  
  // Get valid token (with auto-refresh)
  async getToken() {
    // Check if cached token is valid
    if (this.token && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      console.log('✅ Using cached token');
      return this.token;
    }

    const settings = await this.getSettings();
    
    // CASE 1: Token exists in DB and is still valid
    if (settings.apiToken && settings.lastTokenRefresh) {
      const tokenAge = Date.now() - new Date(settings.lastTokenRefresh).getTime();
      const tokenValidHours = 23 * 60 * 60 * 1000; // 23 hours
      
      if (tokenAge < tokenValidHours) {
        console.log('✅ Using stored API token from database');
        this.token = settings.apiToken;
        this.tokenExpiry = new Date(settings.lastTokenRefresh).getTime() + tokenValidHours;
        return this.token;
      } else {
        console.log('⚠️ Stored token expired, will refresh...');
      }
    }

    // CASE 2: Need new token - try to login
    return await this.refreshToken();
  }

  // Refresh token using credentials
  async refreshToken() {
    console.log('🔄 Attempting to refresh token...');
    
    const settings = await this.getSettings();
    
    try {
      // We need plain password to login
      // For security, we'll use a separate endpoint that accepts plain password
      // Or we can store plain password in a secure way
      
      // For now, we'll check if we have plainPassword field
      if (!settings.plainPassword) {
        throw new Error('No plain password available for token refresh');
      }

      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: settings.email,
        password: settings.plainPassword // This should be plain text
      });

      if (response.data && response.data.token) {
        const newToken = response.data.token;
        const now = new Date();
        
        // Update database
        settings.apiToken = newToken;
        settings.lastTokenRefresh = now;
        settings.tokenExpiry = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        await settings.save();
        
        // Update cache
        this.token = newToken;
        this.tokenExpiry = now.getTime() + (23 * 60 * 60 * 1000);
        
        console.log('✅ Token refreshed successfully');
        return newToken;
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      
      // If login fails, clear invalid token
      settings.apiToken = null;
      settings.lastTokenRefresh = null;
      await settings.save();
      
      throw new Error('Failed to refresh token. Please update credentials.');
    }
  }

  // ==================== SHIPMENT CREATION ====================
  
  async createShipment(orderData) {
    try {
      const token = await this.getToken();

      const payload = {
        order_id: orderData.orderId,
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: '',
        channel_id: '',
        comment: 'Order from Store',
        billing_customer_name: orderData.shippingAddress.fullName,
        billing_last_name: '',
        billing_address: orderData.shippingAddress.address,
        billing_address_2: orderData.shippingAddress.landmark || '',
        billing_city: orderData.shippingAddress.city,
        billing_pincode: orderData.shippingAddress.pincode,
        billing_state: orderData.shippingAddress.state,
        billing_country: orderData.shippingAddress.country || 'India',
        billing_email: orderData.shippingAddress.email,
        billing_phone: orderData.shippingAddress.phone,
        shipping_is_billing: true,
        shipping_customer_name: orderData.shippingAddress.fullName,
        shipping_last_name: '',
        shipping_address: orderData.shippingAddress.address,
        shipping_address_2: orderData.shippingAddress.landmark || '',
        shipping_city: orderData.shippingAddress.city,
        shipping_pincode: orderData.shippingAddress.pincode,
        shipping_state: orderData.shippingAddress.state,
        shipping_country: orderData.shippingAddress.country || 'India',
        shipping_email: orderData.shippingAddress.email,
        shipping_phone: orderData.shippingAddress.phone,
        order_items: orderData.items.map(item => ({
          name: item.name,
          sku: item.sku || `SKU-${item.product}`,
          units: item.quantity,
          selling_price: item.price,
          discount: '',
          tax: '',
          hsn: 441122
        })),
        payment_method: orderData.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Prepaid',
        shipping_charges: orderData.shipping || 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: orderData.discountAmount || 0,
        sub_total: orderData.subtotal,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5
      };

      console.log('📦 Creating shipment in Shiprocket...');

      const response = await axios.post(`${this.baseURL}/orders/create/adhoc`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Shipment created successfully:', response.data);
      return response.data;
      
    } catch (error) {
      // Handle 401 Unauthorized - Token might be invalid
      if (error.response?.status === 401) {
        console.log('⚠️ Token invalid, clearing cache...');
        this.token = null;
        this.tokenExpiry = null;
        
        // Clear token from DB
        try {
          const settings = await this.getSettings();
          settings.apiToken = null;
          settings.lastTokenRefresh = null;
          await settings.save();
        } catch (e) {
          console.error('Failed to clear token:', e.message);
        }
        
        // Retry once with new token
        return this.createShipment(orderData);
      }
      
      console.error('❌ Shiprocket shipment creation failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      throw new Error(error.response?.data?.message || 'Failed to create shipment');
    }
  }

  // ==================== OTHER METHODS ====================
  
  async generateLabel(shipmentId) {
    try {
      const token = await this.getToken();

      const response = await axios.post(`${this.baseURL}/courier/generate/label`, {
        shipment_id: shipmentId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
      
    } catch (error) {
      if (error.response?.status === 401) {
        this.token = null;
        this.tokenExpiry = null;
        return this.generateLabel(shipmentId); // Retry
      }
      throw error;
    }
  }

  async trackShipment(awbCode) {
    try {
      const token = await this.getToken();

      const response = await axios.get(`${this.baseURL}/courier/track/awb/${awbCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
      
    } catch (error) {
      if (error.response?.status === 401) {
        this.token = null;
        this.tokenExpiry = null;
        return this.trackShipment(awbCode); // Retry
      }
      throw error;
    }
  }

  async cancelShipment(shipmentId) {
    try {
      const token = await this.getToken();

      const response = await axios.post(`${this.baseURL}/orders/cancel`, {
        shipment_id: shipmentId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
      
    } catch (error) {
      if (error.response?.status === 401) {
        this.token = null;
        this.tokenExpiry = null;
        return this.cancelShipment(shipmentId); // Retry
      }
      throw error;
    }
  }
}

module.exports = new ShiprocketService();
// Using Twilio as example
const twilio = require('twilio');

const sendSMS = async (phone, message) => {
  try {
    // For development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS] To: ${phone}, Message: ${message}`);
      return true;
    }

    // For production with Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}` // Assuming Indian numbers
    });

    return response.sid;
  } catch (error) {
    console.error('SMS sending failed:', error);
    // Don't throw error, just log it
    return false;
  }
};

module.exports = { sendSMS };
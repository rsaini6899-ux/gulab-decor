const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { cloudinaryUpload, processCloudinaryResponse } = require('../middleware/upload');
// const upload = require('../middleware/upload');

const {
  sendSmsOTP,
  verifySmsOTP,
  resendSmsOTP,
} = require('../controllers/otpController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/sms/send-otp', sendSmsOTP);
router.post('/sms/verify-otp', verifySmsOTP);
router.post('/resend-sms-otp', resendSmsOTP);

router.post('/upload-image', 
  cloudinaryUpload('auth').single('avatar'),
  // upload.processImage('auth'), 
  processCloudinaryResponse,
  authController.uploadAuthImage
);

// Public routes
router.post('/register-admin', authController.registerAdmin);
router.post('/register', authController.registerUser);
router.post('/login', authController.login);


// Google OAuth Routes
router.post('/google', authController.googleAuth);            
router.post('/google/callback', authController.googleAuth);  

// OTP Routes
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);

// Protected routes (require authentication)
router.get('/me', authMiddleware, authController.getMe);
// router.put('/profile', authMiddleware, authController.updateProfile);
router.put(
  '/profile', 
  authMiddleware,
  cloudinaryUpload('auth').fields([{ name: 'avatar', maxCount: 1 }]), // ✅ Changed from 'image' to 'avatar'
  processCloudinaryResponse,
  authController.updateProfile
);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

// Admin only routes (if needed)
router.get('/users', authMiddleware, authController.getAllUsers);
router.get('/users/:id', authMiddleware, authController.getUserById);
router.put('/users/:id', authMiddleware, authController.updateUser);
router.delete('/users/:id', authMiddleware, authController.deleteUser);

module.exports = router;
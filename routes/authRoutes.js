const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload-image', 
  upload.single('avatar'),
  upload.processImage('auth'), 
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
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

// Admin only routes (if needed)
router.get('/users', authMiddleware, authController.getAllUsers);
router.put('/users/:id', authMiddleware, authController.updateUser);

module.exports = router;
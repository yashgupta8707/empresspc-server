// 3. Create paymentRoutes.js
import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentDetails,
  refundPayment
} from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-razorpay-order', protect, createRazorpayOrder);

// Verify Razorpay payment
router.post('/verify-razorpay', protect, verifyRazorpayPayment);

// Get payment details (admin only)
router.get('/payment/:paymentId', protect, admin, getPaymentDetails);

// Process refund (admin only)
router.post('/refund', protect, admin, refundPayment);

export default router;
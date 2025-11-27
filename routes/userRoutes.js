// routes/userRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { placeOrder, cancelOrder, getMyOrders, getOrderById } from '../controllers/userController.js';

const router = express.Router();

// Order routes
router.post('/place-order', protect, placeOrder);
router.put('/cancel-order/:id', protect, cancelOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/order/:id', protect, getOrderById);

export default router;
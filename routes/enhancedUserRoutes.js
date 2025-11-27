// routes/enhancedUserRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  updateUserProfile,
  changePassword,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  verifyPassword,
  getUserActivity,
  deleteUserAccount
} from '../controllers/enhancedAuthController.js';
import { placeOrder, cancelOrder, getMyOrders, getOrderById } from '../controllers/userController.js';

const router = express.Router();

// Profile Management Routes
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.post('/verify-password', protect, verifyPassword);
router.get('/activity', protect, getUserActivity);
router.delete('/account', protect, deleteUserAccount);

// Address Management Routes
router.route('/addresses')
  .get(protect, getUserAddresses)
  .post(protect, addUserAddress);

router.route('/addresses/:addressId')
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);

// Wishlist Routes
router.route('/wishlist')
  .get(protect, getUserWishlist)
  .post(protect, addToWishlist);

router.delete('/wishlist/:productId', protect, removeFromWishlist);

// Order Routes (existing)
router.post('/place-order', protect, placeOrder);
router.put('/cancel-order/:id', protect, cancelOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/order/:id', protect, getOrderById);

export default router;
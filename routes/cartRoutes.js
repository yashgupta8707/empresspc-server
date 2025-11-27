// routes/cartRoutes.js (ES Module version)
import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getUserCart,
  updateUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartHistory,
  syncCart,
  validateCart,
  applyCoupon,
  removeCoupon,
  getCartRecommendations,
  saveForLater,
  moveToCart,
  getSavedItems,
  getShippingEstimate,
  getCartTotals,
  // Admin routes
  getCartAnalytics,
  getAbandonedCarts
} from '../controllers/cartController.js';

const router = express.Router();

// User cart routes
router.route('/:userId')
  .get(protect, getUserCart)
  .put(protect, updateUserCart);

router.post('/:userId/add', protect, addToCart);
router.put('/:userId/item/:cartItemId', protect, updateCartItem);
router.delete('/:userId/item/:cartItemId', protect, removeFromCart);
router.delete('/:userId/clear', protect, clearCart);

// Cart management
router.get('/:userId/history', protect, getCartHistory);
router.post('/:userId/sync', protect, syncCart);
router.post('/:userId/validate', protect, validateCart);

// Coupon management
router.post('/:userId/coupon', protect, applyCoupon);
router.delete('/:userId/coupon', protect, removeCoupon);

// Recommendations and saved items
router.get('/:userId/recommendations', protect, getCartRecommendations);
router.post('/:userId/save-later', protect, saveForLater);
router.post('/:userId/move-to-cart', protect, moveToCart);
router.get('/:userId/saved-items', protect, getSavedItems);

// Shipping and totals
router.post('/:userId/shipping-estimate', protect, getShippingEstimate);
router.post('/:userId/totals', protect, getCartTotals);

// Admin routes
router.get('/admin/analytics', protect, admin, getCartAnalytics);
router.get('/admin/abandoned', protect, admin, getAbandonedCarts);

export default router;
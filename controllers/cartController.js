// controllers/cartController.js (Fixed with proper validation)
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import CartHistory from '../models/CartHistory.js';

// Helper function to validate and clean cart items
const validateAndCleanCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items.filter(item => {
    // Ensure required fields exist
    const hasProductId = item.productId || item.id || item._id;
    const hasName = item.name;
    const hasPrice = typeof item.price === 'number' && item.price >= 0;
    const hasQuantity = typeof item.quantity === 'number' && item.quantity > 0;
    
    return hasProductId && hasName && hasPrice && hasQuantity;
  }).map(item => {
    // Normalize the item structure
    return {
      productId: item.productId || item.id || item._id,
      name: item.name,
      brand: item.brand || '',
      price: item.price,
      originalPrice: item.originalPrice || item.price,
      quantity: item.quantity,
      selectedColor: item.selectedColor || null,
      selectedSize: item.selectedSize || null,
      images: item.images || [],
      cartItemId: item.cartItemId || `${item.productId || item.id || item._id}_${item.selectedColor || 'default'}_${item.selectedSize || 'default'}`,
      addedAt: item.addedAt || new Date(),
      productSnapshot: item.productSnapshot || item.originalProduct || {}
    };
  });
};

// Helper function to validate cart items against database
const validateCartItems = async (cart) => {
  const validItems = [];
  
  for (const item of cart.items) {
    try {
      const product = await Product.findById(item.productId);
      if (product && product.isActive !== false) {
        // Update price if changed
        if (product.price !== item.price) {
          item.originalPrice = item.price;
          item.price = product.price;
        }
        validItems.push(item);
      }
    } catch (error) {
      console.error('Error validating cart item:', error);
    }
  }
  
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }
  
  return cart;
};

// Helper function to save cart to history
const saveCartToHistory = async (userId, items, action = 'update') => {
  try {
    if (items && items.length > 0) {
      // Validate items before saving to history
      const validItems = validateAndCleanCartItems(items);
      if (validItems.length > 0) {
        await CartHistory.create({
          userId,
          items: validItems,
          action,
          timestamp: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error saving cart history:', error);
  }
};

// Helper function to validate coupon
const validateCoupon = async (couponCode, cartTotal) => {
  const validCoupons = {
    'SAVE10': { discount: 10, type: 'percentage', minOrder: 0 },
    'SAVE500': { discount: 500, type: 'fixed', minOrder: 5000 },
    'FIRST20': { discount: 20, type: 'percentage', minOrder: 10000 },
    'WELCOME15': { discount: 15, type: 'percentage', minOrder: 0 }
  };

  const coupon = validCoupons[couponCode.toUpperCase()];
  
  if (!coupon) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  if (cartTotal < coupon.minOrder) {
    return { 
      valid: false, 
      message: `Minimum order amount ₹${coupon.minOrder.toLocaleString()} required` 
    };
  }

  return { valid: true, coupon: { code: couponCode, ...coupon } };
};

// @desc    Get user cart
// @route   GET /api/cart/:userId
// @access  Private
export const getUserCart = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let cart = await Cart.findByUserId(userId);
    
    if (!cart) {
      // Create new cart if doesn't exist
      cart = await Cart.createForUser(userId);
    }

    // Validate cart items (check if products still exist)
    const validatedCart = await validateCartItems(cart);

    res.json({
      success: true,
      items: validatedCart.items,
      summary: validatedCart.summary,
      appliedCoupon: validatedCart.appliedCoupon,
      lastUpdated: validatedCart.lastUpdated
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user cart (full replacement)
// @route   PUT /api/cart/:userId
// @access  Private
export const updateUserCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { items } = req.body;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let cart = await Cart.findByUserId(userId);
    
    if (!cart) {
      cart = await Cart.createForUser(userId);
    }

    // Save current cart to history before updating
    await saveCartToHistory(userId, cart.items, 'sync');

    // Validate and clean the incoming items
    const cleanedItems = validateAndCleanCartItems(items || []);

    // Update cart items
    cart.items = cleanedItems;
    await cart.save();

    res.json({
      success: true,
      message: 'Cart updated successfully',
      items: cart.items,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/:userId/add
// @access  Private
export const addToCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity = 1, selectedColor, selectedSize } = req.body;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate required fields
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check stock
    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    let cart = await Cart.findByUserId(userId);
    if (!cart) {
      cart = await Cart.createForUser(userId);
    }

    // Create cart item
    const cartItemId = `${productId}_${selectedColor || 'default'}_${selectedSize || 'default'}`;
    const cartItem = {
      productId,
      name: product.name,
      brand: product.brand || '',
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      quantity,
      selectedColor,
      selectedSize,
      images: product.images || [],
      cartItemId,
      addedAt: new Date(),
      productSnapshot: product.toObject()
    };

    await cart.addItem(cartItem);
    await saveCartToHistory(userId, [cartItem], 'add');

    res.json({
      success: true,
      message: 'Item added to cart',
      items: cart.items,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:userId/item/:cartItemId
// @access  Private
export const updateCartItem = async (req, res) => {
  try {
    const { userId, cartItemId } = req.params;
    const { quantity } = req.body;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }

    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.updateItemQuantity(cartItemId, quantity);
    await saveCartToHistory(userId, cart.items, 'update');

    res.json({
      success: true,
      message: 'Cart item updated',
      items: cart.items,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:userId/item/:cartItemId
// @access  Private
export const removeFromCart = async (req, res) => {
  try {
    const { userId, cartItemId } = req.params;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.removeItem(cartItemId);
    await saveCartToHistory(userId, cart.items, 'remove');

    res.json({
      success: true,
      message: 'Item removed from cart',
      items: cart.items,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/:userId/clear
// @access  Private
export const clearCart = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await saveCartToHistory(userId, cart.items, 'clear');
    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      items: [],
      summary: cart.summary
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get cart history
// @route   GET /api/cart/:userId/history
// @access  Private
export const getCartHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const history = await CartHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.productId');

    const total = await CartHistory.countDocuments({ userId });

    res.json({
      success: true,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get cart history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Sync cart from client
// @route   POST /api/cart/:userId/sync
// @access  Private
export const syncCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { items, lastSyncTime } = req.body;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let cart = await Cart.findByUserId(userId);
    if (!cart) {
      cart = await Cart.createForUser(userId);
    }

    // Check if server cart is newer
    if (cart.lastSyncTime && new Date(lastSyncTime) < cart.lastSyncTime) {
      // Server has newer data, return server cart
      return res.json({
        success: true,
        conflict: true,
        serverCart: {
          items: cart.items,
          lastSyncTime: cart.lastSyncTime
        },
        message: 'Server cart is newer'
      });
    }

    // Validate and clean the incoming items
    const cleanedItems = validateAndCleanCartItems(items || []);

    // Save current cart to history before updating
    await saveCartToHistory(userId, cart.items, 'sync');
    
    // Update cart with client data
    cart.items = cleanedItems;
    cart.lastSyncTime = new Date();
    await cart.save();

    res.json({
      success: true,
      message: 'Cart synced successfully',
      items: cart.items,
      summary: cart.summary,
      lastSyncTime: cart.lastSyncTime
    });
  } catch (error) {
    console.error('Sync cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Validate cart items
// @route   POST /api/cart/:userId/validate
// @access  Private
export const validateCart = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const validatedCart = await validateCartItems(cart);
    const issues = [];

    // Check for stock issues
    for (const item of validatedCart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        issues.push({
          cartItemId: item.cartItemId,
          issue: 'product_not_found',
          message: 'Product no longer available'
        });
      } else if (product.quantity < item.quantity) {
        issues.push({
          cartItemId: item.cartItemId,
          issue: 'insufficient_stock',
          message: `Only ${product.quantity} items available`,
          availableQuantity: product.quantity
        });
      } else if (product.price !== item.price) {
        issues.push({
          cartItemId: item.cartItemId,
          issue: 'price_changed',
          message: 'Price has changed',
          oldPrice: item.price,
          newPrice: product.price
        });
      }
    }

    res.json({
      success: true,
      valid: issues.length === 0,
      issues,
      items: validatedCart.items,
      summary: validatedCart.summary
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/:userId/coupon
// @access  Private
export const applyCoupon = async (req, res) => {
  try {
    const { userId } = req.params;
    const { couponCode } = req.body;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!couponCode) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Validate coupon
    const couponValidation = await validateCoupon(couponCode, cart.totalPrice);
    
    if (!couponValidation.valid) {
      return res.status(400).json({ message: couponValidation.message });
    }

    await cart.applyCoupon(couponValidation.coupon);

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      appliedCoupon: cart.appliedCoupon,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/:userId/coupon
// @access  Private
export const removeCoupon = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this cart
    if (req.user._id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.removeCoupon();

    res.json({
      success: true,
      message: 'Coupon removed successfully',
      summary: cart.summary
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get cart recommendations
// @route   GET /api/cart/:userId/recommendations
// @access  Private
export const getCartRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;
    
    const cart = await Cart.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    // Get categories from cart items
    const categories = [...new Set(cart.items.map(item => item.productSnapshot?.category).filter(Boolean))];
    
    // Find recommended products
    const recommendations = await Product.find({
      category: { $in: categories },
      _id: { $nin: cart.items.map(item => item.productId) },
      isActive: true
    })
    .sort({ rating: -1, sales: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Placeholder functions for additional features
export const saveForLater = async (req, res) => {
  res.status(501).json({ message: 'Feature not implemented yet' });
};

export const moveToCart = async (req, res) => {
  res.status(501).json({ message: 'Feature not implemented yet' });
};

export const getSavedItems = async (req, res) => {
  res.status(501).json({ message: 'Feature not implemented yet' });
};

export const getShippingEstimate = async (req, res) => {
  res.status(501).json({ message: 'Feature not implemented yet' });
};

// @desc    Get cart totals
// @route   POST /api/cart/:userId/totals
// @access  Private
export const getCartTotals = async (req, res) => {
  try {
    const { userId } = req.params;
    const { couponCode, shippingAddress } = req.body;
    
    const cart = await Cart.findByUserId(userId);
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    let totals = {
      subtotal: cart.totalPrice,
      originalTotal: cart.totalOriginalPrice,
      savings: cart.totalSavings,
      shipping: 0, // Free shipping
      tax: 0, // Calculate based on address
      couponDiscount: 0,
      total: cart.totalPrice
    };

    // Apply coupon if provided
    if (couponCode && couponCode !== cart.appliedCoupon?.code) {
      const couponValidation = await validateCoupon(couponCode, cart.totalPrice);
      if (couponValidation.valid) {
        const coupon = couponValidation.coupon;
        if (coupon.type === 'percentage') {
          totals.couponDiscount = (totals.subtotal * coupon.discount) / 100;
        } else {
          totals.couponDiscount = coupon.discount;
        }
      }
    } else if (cart.appliedCoupon) {
      if (cart.appliedCoupon.type === 'percentage') {
        totals.couponDiscount = (totals.subtotal * cart.appliedCoupon.discount) / 100;
      } else {
        totals.couponDiscount = cart.appliedCoupon.discount;
      }
    }

    totals.total = totals.subtotal - totals.couponDiscount + totals.shipping + totals.tax;

    res.json({
      success: true,
      totals
    });
  } catch (error) {
    console.error('Get cart totals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get cart analytics (Admin)
// @route   GET /api/cart/admin/analytics
// @access  Private/Admin
export const getCartAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await Cart.aggregate([
      { $match: { lastUpdated: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalCarts: { $sum: 1 },
          totalItems: { $sum: '$totalItems' },
          totalValue: { $sum: '$totalPrice' },
          averageCartValue: { $avg: '$totalPrice' },
          averageItemsPerCart: { $avg: '$totalItems' }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: analytics[0] || {}
    });
  } catch (error) {
    console.error('Get cart analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get abandoned carts (Admin)
// @route   GET /api/cart/admin/abandoned
// @access  Private/Admin
export const getAbandonedCarts = async (req, res) => {
  try {
    const { days = 7, page = 1, limit = 20 } = req.query;
    
    const abandonedCarts = await Cart.getAbandonedCarts(parseInt(days))
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Cart.find({
      lastUpdated: { $lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      'items.0': { $exists: true },
      isAbandoned: { $ne: true }
    }).countDocuments();

    res.json({
      success: true,
      abandonedCarts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get abandoned carts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// models/Cart.js
// const mongoose = require('mongoose');
import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  brand: String,
  price: {
    type: Number,
    required: true
  },
  originalPrice: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  selectedColor: String,
  selectedSize: String,
  images: [String],
  cartItemId: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  // Store product snapshot at time of adding to cart
  productSnapshot: {
    type: mongoose.Schema.Types.Mixed
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  appliedCoupon: {
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    appliedAt: Date
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  totalOriginalPrice: {
    type: Number,
    default: 0
  },
  totalSavings: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastSyncTime: {
    type: Date,
    default: Date.now
  },
  // Track cart sessions for analytics
  sessionId: String,
  // Flag for abandoned cart detection
  isAbandoned: {
    type: Boolean,
    default: false
  },
  abandonedAt: Date,
  // Cart expiry (for cleanup)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for better performance
cartSchema.index({ userId: 1 });
cartSchema.index({ lastUpdated: -1 });
cartSchema.index({ isAbandoned: 1, abandonedAt: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for cart summary
cartSchema.virtual('summary').get(function() {
  return {
    totalItems: this.totalItems,
    totalPrice: this.totalPrice,
    totalOriginalPrice: this.totalOriginalPrice,
    totalSavings: this.totalSavings,
    itemCount: this.items.length,
    isEmpty: this.items.length === 0,
    hasDiscounts: this.totalSavings > 0,
    hasCoupon: !!this.appliedCoupon
  };
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.totalOriginalPrice = this.items.reduce((sum, item) => {
      const originalPrice = item.originalPrice || item.price;
      return sum + (originalPrice * item.quantity);
    }, 0);
    this.totalSavings = this.totalOriginalPrice - this.totalPrice;
  } else {
    this.totalItems = 0;
    this.totalPrice = 0;
    this.totalOriginalPrice = 0;
    this.totalSavings = 0;
  }
  
  this.lastUpdated = new Date();
  next();
});

// Methods
cartSchema.methods.addItem = function(item) {
  const existingItemIndex = this.items.findIndex(
    cartItem => cartItem.cartItemId === item.cartItemId
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += item.quantity;
  } else {
    // Add new item
    this.items.push(item);
  }
  
  return this.save();
};

cartSchema.methods.updateItemQuantity = function(cartItemId, quantity) {
  const item = this.items.find(item => item.cartItemId === cartItemId);
  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter(item => item.cartItemId !== cartItemId);
    } else {
      item.quantity = quantity;
    }
  }
  return this.save();
};

cartSchema.methods.removeItem = function(cartItemId) {
  this.items = this.items.filter(item => item.cartItemId !== cartItemId);
  return this.save();
};

cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupon = undefined;
  return this.save();
};

cartSchema.methods.applyCoupon = function(couponData) {
  this.appliedCoupon = {
    ...couponData,
    appliedAt: new Date()
  };
  return this.save();
};

cartSchema.methods.removeCoupon = function() {
  this.appliedCoupon = undefined;
  return this.save();
};

cartSchema.methods.markAbandoned = function() {
  this.isAbandoned = true;
  this.abandonedAt = new Date();
  return this.save();
};

// Static methods
cartSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('items.productId');
};

cartSchema.statics.createForUser = function(userId) {
  return this.create({ userId, items: [] });
};

cartSchema.statics.getAbandonedCarts = function(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    lastUpdated: { $lt: cutoffDate },
    'items.0': { $exists: true }, // Has items
    isAbandoned: { $ne: true }
  }).populate('userId', 'name email');
};

cartSchema.statics.cleanupExpiredCarts = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

const Cart = mongoose.model('Cart', cartSchema);

// module.exports = Cart;
export default Cart;
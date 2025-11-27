// models/CartHistory.js
import mongoose from 'mongoose';

const cartHistoryItemSchema = new mongoose.Schema({
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
    required: true
  },
  selectedColor: String,
  selectedSize: String,
  images: [String],
  cartItemId: String,
  productSnapshot: {
    type: mongoose.Schema.Types.Mixed
  }
});

const cartHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartHistoryItemSchema],
  action: {
    type: String,
    enum: ['add', 'update', 'remove', 'clear', 'sync', 'checkout'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: String,
  // Snapshot of cart state at this point
  cartSnapshot: {
    totalPrice: Number,
    totalOriginalPrice: Number,
    totalSavings: Number,
    totalItems: Number,
    appliedCoupon: {
      code: String,
      discount: Number,
      type: String
    }
  },
  // Device and browser info for analytics
  deviceInfo: {
    userAgent: String,
    ip: String,
    device: String,
    browser: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
cartHistorySchema.index({ userId: 1, timestamp: -1 });
cartHistorySchema.index({ timestamp: -1 });
cartHistorySchema.index({ action: 1, timestamp: -1 });

// Virtual for formatted timestamp
cartHistorySchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Static methods for analytics
cartHistorySchema.statics.getUserCartActivity = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    userId,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

cartHistorySchema.statics.getCartActivityByAction = function(action, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    action,
    timestamp: { $gte: startDate }
  }).populate('userId', 'name email');
};

cartHistorySchema.statics.getCartConversionData = function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

// Clean up old history records (keep only last 90 days)
cartHistorySchema.statics.cleanupOldHistory = function() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
};

const CartHistory = mongoose.model('CartHistory', cartHistorySchema);

export default CartHistory;
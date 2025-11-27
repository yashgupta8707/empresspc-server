// models/Order.js
import mongoose from 'mongoose';

const orderItemSchema = mongoose.Schema({
  quantity: { 
    type: Number, 
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: { 
    type: Number, 
    required: true,
    min: [0, 'Price cannot be negative']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  selectedColor: {
    type: String,
    trim: true
  },
  selectedSize: {
    type: String,
    trim: true
  }
});

const shippingAddressSchema = mongoose.Schema({
  firstName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  company: { 
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  address: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  apartment: { 
    type: String,
    trim: true,
    maxlength: [50, 'Apartment cannot exceed 50 characters']
  },
  city: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [50, 'City cannot exceed 50 characters']
  },
  state: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  pincode: { 
    type: String, 
    required: true,
    trim: true,
    match: [/^\d{6}$/, 'PIN code must be 6 digits']
  },
  phone: { 
    type: String, 
    required: true,
    trim: true,
    match: [/^\d{10}$/, 'Phone number must be 10 digits']
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  }
});

const orderSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  orderItems: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  paymentMethod: { 
    type: String, 
    required: true,
    enum: {
      values: ['cod', 'online', 'card', 'upi', 'netbanking'],
      message: 'Invalid payment method'
    }
  },
  totalPrice: { 
    type: Number, 
    required: true,
    min: [0, 'Total price cannot be negative']
  },
  status: { 
    type: String, 
    enum: {
      values: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      message: 'Invalid order status'
    }, 
    default: 'Pending' 
  },
  isPaid: { 
    type: Boolean, 
    default: false 
  },
  paidAt: { 
    type: Date 
  },
  isDelivered: { 
    type: Boolean, 
    default: false 
  },
  deliveredAt: { 
    type: Date 
  },
  cancelledAt: { 
    type: Date 
  },
  paymentResult: {
    id: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      trim: true
    },
    razorpay_order_id: {
      type: String,
      trim: true
    },
    razorpay_payment_id: {
      type: String,
      trim: true
    },
    razorpay_signature: {
      type: String,
      trim: true
    },
    update_time: {
      type: Date,
      default: Date.now
    }
  },
  // Tracking information
  trackingNumber: {
    type: String,
    trim: true
  },
  shippingCarrier: {
    type: String,
    trim: true
  },
  // Order notes
  orderNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Order notes cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  // Tax and discount information
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  // Order history for status changes
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isPaid: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1 });
orderSchema.index({ 'paymentResult.razorpay_payment_id': 1 });
orderSchema.index({ 'paymentResult.razorpay_order_id': 1 });
orderSchema.index({ trackingNumber: 1 });

// Virtual for order total items count
orderSchema.virtual('totalItems').get(function() {
  return this.orderItems.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order ID display (last 8 characters)
orderSchema.virtual('displayId').get(function() {
  return this._id.toString().slice(-8).toUpperCase();
});

// Virtual for full customer name
orderSchema.virtual('customerName').get(function() {
  return `${this.shippingAddress.firstName} ${this.shippingAddress.lastName}`;
});

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update status history
orderSchema.pre('save', function(next) {
  // Add to status history if status changed
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  
  // Set paidAt when isPaid becomes true
  if (this.isModified('isPaid') && this.isPaid && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  // Set deliveredAt when isDelivered becomes true
  if (this.isModified('isDelivered') && this.isDelivered && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  
  // Set cancelledAt when status becomes Cancelled
  if (this.isModified('status') && this.status === 'Cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  
  next();
});

// Static method to get orders with filters
orderSchema.statics.findWithFilters = function(filters = {}) {
  const query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.paymentMethod) {
    query.paymentMethod = filters.paymentMethod;
  }
  
  if (filters.isPaid !== undefined) {
    query.isPaid = filters.isPaid;
  }
  
  if (filters.dateFrom) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.dateFrom) };
  }
  
  if (filters.dateTo) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
  }
  
  return this.find(query);
};

// Instance method to calculate order summary
orderSchema.methods.getOrderSummary = function() {
  const subtotal = this.orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const total = subtotal + this.taxAmount + this.shippingCost - this.discountAmount;
  
  return {
    subtotal,
    taxAmount: this.taxAmount,
    shippingCost: this.shippingCost,
    discountAmount: this.discountAmount,
    total,
    totalItems: this.totalItems
  };
};

// Instance method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['Pending', 'Processing'].includes(this.status);
};

// Instance method to check if order can be returned
orderSchema.methods.canBeReturned = function() {
  if (this.status !== 'Delivered') return false;
  
  // Allow returns within 7 days of delivery
  const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const now = new Date();
  const deliveryDate = this.deliveredAt;
  
  return deliveryDate && (now - deliveryDate) <= returnWindow;
};

// Ensure virtuals are included in JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
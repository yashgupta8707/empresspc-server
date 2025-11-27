// ===========================
// 2. FIXED routes/orderRoutes.js (REMOVE TRANSACTIONS)
// ===========================
import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create order (COD and online payments) - NO TRANSACTIONS
router.post('/create', protect, async (req, res) => {
  try {
    console.log('📝 Creating order with request body:', req.body);
    console.log('👤 User info:', { id: req.user._id, name: req.user.name });
    
    const { orderItems, shippingAddress, paymentMethod, totalPrice, isPaid = false } = req.body;

    // Validate input data
    if (!orderItems || orderItems.length === 0) {
      console.error('❌ No order items provided');
      return res.status(400).json({
        success: false,
        message: 'No order items provided'
      });
    }

    if (!shippingAddress) {
      console.error('❌ No shipping address provided');
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }

    if (!req.user || !req.user._id) {
      console.error('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('📦 Processing order for user:', req.user._id);

    // Validate and update products (NO TRANSACTIONS - simpler approach)
    for (const item of orderItems) {
      console.log('🔍 Processing item:', item);
      
      if (!item.product) {
        throw new Error('Product ID is required for all items');
      }

      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }
      
      console.log(`📊 Product ${product.name}: Available=${product.quantity}, Requested=${item.quantity}`);
      
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
      }
      
      // Update product quantity
      product.quantity -= item.quantity;
      await product.save();
      console.log(`✅ Updated ${product.name} stock to ${product.quantity}`);
    }

    // Create order
    const orderData = {
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      totalPrice,
      isPaid,
      status: isPaid ? 'Processing' : 'Pending'
    };

    if (isPaid) {
      orderData.paidAt = new Date();
    }

    console.log('💾 Creating order with data:', {
      userId: orderData.user,
      itemCount: orderData.orderItems.length,
      total: orderData.totalPrice,
      method: orderData.paymentMethod,
      status: orderData.status
    });

    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    console.log('✅ Order created successfully:', savedOrder._id);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('❌ Order creation error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

// Get user orders
router.get('/user/myorders', protect, async (req, res) => {
  try {
    console.log('📋 Fetching orders for user:', req.user._id);
    
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name images price brand')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders for user`);

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('❌ Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get order by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin routes
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email phone')
      .populate('orderItems.product', 'name images price brand')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('❌ Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
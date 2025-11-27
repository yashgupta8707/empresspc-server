import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// Mock mode for testing - set to false when you have real credentials
const MOCK_MODE = true; // Change to false when you have valid Razorpay credentials

let razorpay = null;
if (!MOCK_MODE) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

export const createRazorpayOrder = async (req, res) => {
  try {
    console.log('📝 Creating Razorpay order with data:', req.body);
    
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount < 1) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount is required and should be greater than 0'
      });
    }

    if (MOCK_MODE) {
      console.log('🎭 MOCK MODE: Creating fake Razorpay order');
      
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount: Math.round(amount),
        amount_paid: 0,
        amount_due: Math.round(amount),
        currency,
        receipt: receipt || `order_${Date.now()}`,
        status: 'created',
        attempts: 0,
        notes: notes || {},
        created_at: Math.floor(Date.now() / 1000)
      };

      console.log('✅ Mock Razorpay order created:', mockOrder.id);
      return res.status(200).json({
        success: true,
        order: mockOrder,
        key_id: 'rzp_test_mock_key'
      });
    }

    // Real Razorpay implementation
    const options = {
      amount: Math.round(amount),
      currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {}
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);

    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    console.log('🔐 Verifying payment:', req.body);
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment parameters'
      });
    }

    let isAuthentic = true;
    
    if (!MOCK_MODE) {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
      isAuthentic = expectedSignature === razorpay_signature;
    } else {
      console.log('🎭 MOCK MODE: Skipping signature verification');
    }

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Process order (same logic as COD but with payment info)
    await processOrder(req, res, orderData, true, {
      id: razorpay_payment_id,
      status: 'completed',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      ...(MOCK_MODE && { mock: true })
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

// Shared order processing function
const processOrder = async (req, res, orderData, isPaid = false, paymentResult = null) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!orderData || !orderData.orderItems || !Array.isArray(orderData.orderItems)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data'
      });
    }

    console.log('📦 Processing order for user:', req.user._id);

    // Validate products and update quantities
    for (const item of orderData.orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      
      product.quantity -= item.quantity;
      await product.save();
      console.log(`📦 Updated ${product.name} stock`);
    }

    // Create order
    const order = new Order({
      user: req.user._id,
      orderItems: orderData.orderItems,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: isPaid ? 'online' : 'cod',
      totalPrice: orderData.totalPrice,
      isPaid,
      ...(isPaid && { paidAt: new Date() }),
      status: isPaid ? 'Processing' : 'Pending',
      ...(paymentResult && { paymentResult })
    });

    const savedOrder = await order.save();
    console.log('✅ Order created:', savedOrder._id);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('❌ Order processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process order'
    });
  }
};

export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (MOCK_MODE) {
      return res.status(200).json({
        success: true,
        payment: {
          id: paymentId,
          status: 'captured',
          amount: 14200,
          currency: 'INR',
          mock: true
        }
      });
    }
    
    const payment = await razorpay.payments.fetch(paymentId);
    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('❌ Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    
    if (MOCK_MODE) {
      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully (mock)',
        refund: {
          id: `rfnd_mock_${Date.now()}`,
          payment_id: paymentId,
          amount: Math.round(amount),
          status: 'processed',
          mock: true
        }
      });
    }
    
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount),
      notes: {
        reason: reason || 'Customer request',
        processed_by: req.user._id,
        processed_at: new Date().toISOString()
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund
    });
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// routes/adminRoutes.js - Updated with Events and Contacts
import express from 'express';
import { 
  createProduct, 
  editProduct, 
  getAllProducts, 
  deleteProduct,
  getAllOrders,
  getOrderById,
  getAllUsers,
  getUserOrderHistory,
  getOrderStats, 
  markOrderAsDelivered,
  markOrderAsPaid,
  updateOrderStatus,
} from '../controllers/adminController.js';

// Import blog functions for admin
import {
  getAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats
} from '../controllers/blogController.js';

// Import event functions for admin
import {
  getAllEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats
} from '../controllers/eventController.js';

// Import contact functions for admin
import {
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactStats
} from '../controllers/contactController.js';

import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(admin);

// ========== PRODUCT MANAGEMENT ==========
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.put('/products/:id', editProduct);
router.delete('/products/:id', deleteProduct);

// ========== ORDER MANAGEMENT ==========
router.get('/orders', getAllOrders);
router.get('/orders/stats', getOrderStats);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/delivered', markOrderAsDelivered);
router.put('/orders/:id/paid', markOrderAsPaid);

// ========== USER MANAGEMENT ==========
router.get('/users', getAllUsers);
router.get('/users/:id/orders', getUserOrderHistory);

// ========== BLOG MANAGEMENT ==========
router.get('/blogs', getAllBlogsAdmin);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.get('/blogs/stats', getBlogStats);

// ========== EVENT MANAGEMENT ==========
router.get('/events', getAllEventsAdmin);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.get('/events/stats', getEventStats);

// ========== CONTACT MANAGEMENT ==========
router.get('/contacts', getAllContacts);
router.get('/contacts/stats', getContactStats);
router.get('/contacts/:id', getContactById);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

// ========== DASHBOARD STATS ==========
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get basic stats for dashboard
    res.json({
      success: true,
      data: {
        orders: { total: 0, pending: 0, delivered: 0 },
        blogs: { total: 0, published: 0, drafts: 0 },
        events: { total: 0, upcoming: 0, active: 0 },
        contacts: { total: 0, unread: 0, urgent: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

export default router;
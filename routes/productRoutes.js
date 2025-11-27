// routes/productRoutes.js - Optimized with enhanced error handling and performance
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAllProducts,
  getProductsByCategory,
  getProductById,
  getFeaturedProducts,
  getCategories,
  searchProducts,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  bulkUpdateProducts,
  getLowStockProducts,
  updateProductStock,
  getProductsByCategoryWithSpecs
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateProductInput, validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Rate limiting for different route types
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit search requests
  message: {
    success: false,
    message: 'Too many search requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // higher limit for admin operations
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========== PUBLIC ROUTES ==========

// Health check for products
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Product routes working',
    timestamp: new Date().toISOString()
  });
});

// Get all products with filters (with rate limiting)
router.get('/', publicRateLimit, getAllProducts);

// Get featured products
router.get('/featured', publicRateLimit, getFeaturedProducts);

// Get categories with product counts
router.get('/categories', publicRateLimit, getCategories);

// Search products (with search-specific rate limiting)
router.get('/search', searchRateLimit, searchProducts);

// Get products by category (must be before /:id route)
router.get('/category/:categoryId', publicRateLimit, getProductsByCategory);

// PC Builder specific routes
router.get('/pc-builder/category/:category', publicRateLimit, getProductsByCategoryWithSpecs);

// Get product by ID with validation
router.get('/public/:id', publicRateLimit, validateObjectId, getProductById);
router.get('/details/:id', publicRateLimit, validateObjectId, getProductById);

// Generic product by ID route (must be last among GET routes)
router.get('/:id', publicRateLimit, validateObjectId, getProductById);

// ========== ADMIN ROUTES ==========

// Admin routes with authentication, authorization, and rate limiting
router.use('/admin', protect, admin, adminRateLimit);

// Get all products for admin with enhanced filtering
router.get('/admin/all', getAllProductsAdmin);

// Get product statistics
router.get('/admin/stats', getProductStats);

// Get low stock products
router.get('/admin/low-stock', getLowStockProducts);

// Get single product for admin
router.get('/admin/:id', validateObjectId, getProductById);

// Create new product with validation
router.post('/admin/create', validateProductInput, createProduct);

// Update product with validation
router.put('/admin/:id', validateObjectId, validateProductInput, updateProduct);

// Update product stock specifically
router.patch('/admin/:id/stock', validateObjectId, updateProductStock);

// Bulk update products
router.put('/admin/bulk-update', bulkUpdateProducts);

// Delete product with validation
router.delete('/admin/:id', validateObjectId, deleteProduct);

// ========== ERROR HANDLING MIDDLEWARE ==========

// Global error handler for product routes
router.use((error, req, res, next) => {
  console.error('Product Route Error:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    const errorMessages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errorMessages
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

export default router;
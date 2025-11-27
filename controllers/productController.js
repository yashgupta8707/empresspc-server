// controllers/productController.js - Optimized version with enhanced error handling and performance
import Product from '../models/Product.js';
import asyncHandler from 'express-async-handler';

// ========== UTILITY FUNCTIONS ==========

// Validate and sanitize pagination parameters
const getPaginationParams = (page = 1, limit = 12) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(Math.max(1, parseInt(limit) || 12), 100); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, skip };
};

// Build sort options
const getSortOptions = (sortBy = 'createdAt', order = 'desc') => {
  const sortOrder = order === 'desc' ? -1 : 1;
  
  const allowedSortFields = {
    'price': { price: sortOrder },
    'name': { name: sortOrder },
    'rating': { rating: sortOrder },
    'newest': { createdAt: -1 },
    'oldest': { createdAt: 1 },
    'popular': { purchaseCount: -1, views: -1 },
    'featured': { isFeatured: -1, rating: -1 }
  };
  
  return allowedSortFields[sortBy] || { [sortBy]: sortOrder };
};

// Build filter query
const buildFilterQuery = (filters, includeInactive = false) => {
  const query = {};
  
  // Only show active products for public routes
  if (!includeInactive) {
    query.isActive = true;
  }
  
  // Category filter
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  
  // Brand filter
  if (filters.brand && filters.brand !== 'all') {
    query.brand = new RegExp(filters.brand, 'i');
  }
  
  // Performance filter
  if (filters.performance && filters.performance !== 'all') {
    query.performance = filters.performance;
  }
  
  // Price range filter
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
    if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
  }
  
  // Stock filter
  if (filters.inStock) {
    query.quantity = { $gt: 0 };
  }
  
  // Featured filter
  if (filters.featured === 'true') {
    query.isFeatured = true;
  }
  
  // Search filter
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { brand: { $regex: filters.search, $options: 'i' } },
      { 'keyFeatures': { $in: [new RegExp(filters.search, 'i')] } },
      { 'specifications.items.label': { $regex: filters.search, $options: 'i' } },
      { 'specifications.items.value': { $regex: filters.search, $options: 'i' } },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }
  
  return query;
};

// Standard response format
const sendResponse = (res, statusCode, success, data = null, message = null) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// ========== PUBLIC ROUTES ==========

// @desc    Get all products with advanced filtering and pagination
// @route   GET /api/products
// @access  Public
export const getAllProducts = asyncHandler(async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query.page, req.query.limit);
    const sortOptions = getSortOptions(req.query.sortBy, req.query.order);
    const filterQuery = buildFilterQuery(req.query);

    // Execute query with pagination
    const [products, total] = await Promise.all([
      Product.find(filterQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      Product.countDocuments(filterQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    // Get filter options for frontend
    const [categories, brands] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('brand', { isActive: true })
    ]);

    const responseData = {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      filters: {
        categories: categories.sort(),
        brands: brands.sort()
      }
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
export const getProductsByCategory = asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page, limit, skip } = getPaginationParams(req.query.page, req.query.limit);
    const sortOptions = getSortOptions(req.query.sortBy, req.query.order);
    
    const filters = { ...req.query, category: categoryId };
    const filterQuery = buildFilterQuery(filters);

    // Execute query with pagination
    const [products, total, availableBrands] = await Promise.all([
      Product.find(filterQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filterQuery),
      Product.distinct('brand', { category: categoryId, isActive: true })
    ]);

    const totalPages = Math.ceil(total / limit);

    const responseData = {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      category: categoryId,
      availableBrands: availableBrands.sort()
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendResponse(res, 400, false, null, 'Invalid product ID format');
    }

    // Find product and increment view count
    const product = await Product.findOneAndUpdate(
      { _id: id, isActive: true },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();
    
    if (!product) {
      return sendResponse(res, 404, false, null, 'Product not found');
    }

    // Get related products (same category, excluding current product)
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isActive: true
    })
    .sort({ rating: -1, purchaseCount: -1 })
    .limit(6)
    .lean();

    const responseData = {
      product,
      relatedProducts
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in getProductById:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 8, 20); // Max 20 featured products
    
    const products = await Product.find({
      isActive: true,
      $or: [
        { isFeatured: true },
        { 'badge.text': { $in: ['Featured', 'Hot', 'Popular'] } },
        { rating: { $gte: 4.0 } }
      ]
    })
    .sort({ isFeatured: -1, rating: -1, purchaseCount: -1, createdAt: -1 })
    .limit(limitNum)
    .lean();

    sendResponse(res, 200, true, products);
  } catch (error) {
    console.error('Error in getFeaturedProducts:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Get categories with counts
// @route   GET /api/products/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    sendResponse(res, 200, true, categories);
  } catch (error) {
    console.error('Error in getCategories:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
export const searchProducts = asyncHandler(async (req, res) => {
  try {
    const { q, ...otherFilters } = req.query;
    
    if (!q || q.trim().length < 2) {
      return sendResponse(res, 400, false, null, 'Search query must be at least 2 characters');
    }

    const { page, limit, skip } = getPaginationParams(req.query.page, req.query.limit);
    const sortOptions = getSortOptions(req.query.sortBy, req.query.order);
    
    const filters = { ...otherFilters, search: q.trim() };
    const filterQuery = buildFilterQuery(filters);

    const [products, total] = await Promise.all([
      Product.find(filterQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filterQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    const responseData = {
      products,
      query: q,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in searchProducts:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// ========== ADMIN ROUTES ==========

// @desc    Get all products for admin
// @route   GET /api/products/admin/all
// @access  Private (Admin)
export const getAllProductsAdmin = asyncHandler(async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query.page, req.query.limit || 20);
    const sortOptions = getSortOptions(req.query.sortBy, req.query.order);
    const filterQuery = buildFilterQuery(req.query, true); // Include inactive products

    const [products, total] = await Promise.all([
      Product.find(filterQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filterQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    const responseData = {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in getAllProductsAdmin:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Create new product
// @route   POST /api/products/admin/create
// @access  Private (Admin)
export const createProduct = asyncHandler(async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'brand', 'category', 'price'];
    const missingFields = requiredFields.filter(field => !productData[field]);
    
    if (missingFields.length > 0) {
      return sendResponse(res, 400, false, null, 
        `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate image URLs if provided
    if (productData.images && productData.images.length > 0) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
      
      const invalidImages = productData.images.filter(img => 
        img && !(urlPattern.test(img) && imagePattern.test(img))
      );
      
      if (invalidImages.length > 0) {
        return sendResponse(res, 400, false, null, 
          'Invalid image URLs detected. Please provide valid image URLs ending with image extensions.');
      }
    }

    // Clean and process data
    const cleanedData = {
      ...productData,
      price: parseFloat(productData.price),
      originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : undefined,
      quantity: productData.quantity ? parseInt(productData.quantity) : 0,
      rating: productData.rating ? parseFloat(productData.rating) : 0,
      reviews: productData.reviews ? parseInt(productData.reviews) : 0,
      warrantyPeriod: productData.warrantyPeriod ? parseInt(productData.warrantyPeriod) : 12,
      minStockLevel: productData.minStockLevel ? parseInt(productData.minStockLevel) : 5,
      maxStockLevel: productData.maxStockLevel ? parseInt(productData.maxStockLevel) : 100,
      weight: productData.weight ? parseFloat(productData.weight) : undefined
    };

    // Process dimensions
    if (productData.dimensions) {
      cleanedData.dimensions = {
        length: productData.dimensions.length ? parseFloat(productData.dimensions.length) : undefined,
        width: productData.dimensions.width ? parseFloat(productData.dimensions.width) : undefined,
        height: productData.dimensions.height ? parseFloat(productData.dimensions.height) : undefined
      };
    }

    const product = new Product(cleanedData);
    const savedProduct = await product.save();
    
    sendResponse(res, 201, true, savedProduct, 'Product created successfully');
  } catch (error) {
    console.error('Error in createProduct:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, null, errorMessages.join('. '));
    }
    
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Update product
// @route   PUT /api/products/admin/:id
// @access  Private (Admin)
export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendResponse(res, 400, false, null, 'Invalid product ID format');
    }

    // Validate image URLs if provided
    if (updateData.images && updateData.images.length > 0) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
      
      const invalidImages = updateData.images.filter(img => 
        img && !(urlPattern.test(img) && imagePattern.test(img))
      );
      
      if (invalidImages.length > 0) {
        return sendResponse(res, 400, false, null, 
          'Invalid image URLs detected. Please provide valid image URLs ending with image extensions.');
      }
    }

    // Clean and process numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.originalPrice) updateData.originalPrice = parseFloat(updateData.originalPrice);
    if (updateData.quantity) updateData.quantity = parseInt(updateData.quantity);
    if (updateData.rating) updateData.rating = parseFloat(updateData.rating);
    if (updateData.reviews) updateData.reviews = parseInt(updateData.reviews);
    if (updateData.warrantyPeriod) updateData.warrantyPeriod = parseInt(updateData.warrantyPeriod);
    if (updateData.minStockLevel) updateData.minStockLevel = parseInt(updateData.minStockLevel);
    if (updateData.maxStockLevel) updateData.maxStockLevel = parseInt(updateData.maxStockLevel);
    if (updateData.weight) updateData.weight = parseFloat(updateData.weight);

    // Process dimensions
    if (updateData.dimensions) {
      if (updateData.dimensions.length) updateData.dimensions.length = parseFloat(updateData.dimensions.length);
      if (updateData.dimensions.width) updateData.dimensions.width = parseFloat(updateData.dimensions.width);
      if (updateData.dimensions.height) updateData.dimensions.height = parseFloat(updateData.dimensions.height);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return sendResponse(res, 404, false, null, 'Product not found');
    }

    sendResponse(res, 200, true, product, 'Product updated successfully');
  } catch (error) {
    console.error('Error in updateProduct:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, null, errorMessages.join('. '));
    }
    
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Delete product
// @route   DELETE /api/products/admin/:id
// @access  Private (Admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendResponse(res, 400, false, null, 'Invalid product ID format');
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return sendResponse(res, 404, false, null, 'Product not found');
    }

    sendResponse(res, 200, true, null, 'Product deleted successfully');
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Get product statistics
// @route   GET /api/products/admin/stats
// @access  Private (Admin)
export const getProductStats = asyncHandler(async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      inStockProducts,
      outOfStockProducts,
      lowStockProducts,
      categoryStats,
      brandStats,
      priceStats
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ quantity: { $gt: 0 }, isActive: true }),
      Product.countDocuments({ quantity: { $lte: 0 }, isActive: true }),
      Product.countDocuments({ 
        $expr: { $lte: ['$quantity', '$minStockLevel'] },
        isActive: true 
      }),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
          }
        }
      ])
    ]);

    const responseData = {
      totalProducts,
      activeProducts,
      inStockProducts,
      outOfStockProducts,
      lowStockProducts,
      categoryStats,
      brandStats,
      priceStats: priceStats[0] || {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalValue: 0
      }
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in getProductStats:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Bulk update products
// @route   PUT /api/products/admin/bulk-update
// @access  Private (Admin)
export const bulkUpdateProducts = asyncHandler(async (req, res) => {
  try {
    const { productIds, updates } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return sendResponse(res, 400, false, null, 'Product IDs array is required');
    }

    if (!updates || typeof updates !== 'object') {
      return sendResponse(res, 400, false, null, 'Updates object is required');
    }

    // Validate all product IDs
    const invalidIds = productIds.filter(id => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return sendResponse(res, 400, false, null, 'Invalid product ID format detected');
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updates },
      { runValidators: true }
    );

    sendResponse(res, 200, true, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    }, `Successfully updated ${result.modifiedCount} products`);
  } catch (error) {
    console.error('Error in bulkUpdateProducts:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Get low stock products
// @route   GET /api/products/admin/low-stock
// @access  Private (Admin)
export const getLowStockProducts = asyncHandler(async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
      isActive: true
    })
    .sort({ quantity: 1 })
    .limit(parseInt(limit))
    .lean();

    sendResponse(res, 200, true, lowStockProducts);
  } catch (error) {
    console.error('Error in getLowStockProducts:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// @desc    Update product stock
// @route   PATCH /api/products/admin/:id/stock
// @access  Private (Admin)
export const updateProductStock = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendResponse(res, 400, false, null, 'Invalid product ID format');
    }

    if (quantity === undefined || quantity < 0) {
      return sendResponse(res, 400, false, null, 'Valid quantity is required');
    }

    let updateQuery;
    if (operation === 'increment') {
      updateQuery = { $inc: { quantity: parseInt(quantity) } };
    } else if (operation === 'decrement') {
      updateQuery = { $inc: { quantity: -parseInt(quantity) } };
    } else {
      updateQuery = { $set: { quantity: parseInt(quantity) } };
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!product) {
      return sendResponse(res, 404, false, null, 'Product not found');
    }

    // Ensure quantity doesn't go negative
    if (product.quantity < 0) {
      product.quantity = 0;
      await product.save();
    }

    sendResponse(res, 200, true, product, 'Stock updated successfully');
  } catch (error) {
    console.error('Error in updateProductStock:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

// ========== PC BUILDER SPECIFIC ROUTES ==========

// @desc    Get products by category with PC Builder specs
// @route   GET /api/products/pc-builder/category/:category
// @access  Public
export const getProductsByCategoryWithSpecs = asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const { platform, socket, chipset, priceMin, priceMax, brand, limit = 20, page = 1 } = req.query;

    const query = {
      category: category.toLowerCase(),
      isActive: true
    };

    // Platform filtering for PC Builder
    if (platform && ['intel', 'amd'].includes(platform)) {
      query.$or = [
        { 'pcBuilderSpecs.platform': platform },
        { 'pcBuilderSpecs.platform': 'universal' }
      ];
    }

    // Socket filtering
    if (socket) {
      if (category === 'processors') {
        query['specifications.items'] = {
          $elemMatch: {
            label: /socket/i,
            value: new RegExp(socket, 'i')
          }
        };
      } else if (category === 'motherboards') {
        query['specifications.items'] = {
          $elemMatch: {
            label: /socket/i,
            value: new RegExp(socket, 'i')
          }
        };
      }
    }

    // Chipset filtering
    if (chipset && category === 'motherboards') {
      query['specifications.items'] = {
        $elemMatch: {
          label: /chipset/i,
          value: new RegExp(chipset, 'i')
        }
      };
    }

    // Price filtering
    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = parseInt(priceMin);
      if (priceMax) query.price.$lte = parseInt(priceMax);
    }

    // Brand filtering
    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ price: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    const responseData = {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    };

    sendResponse(res, 200, true, responseData);
  } catch (error) {
    console.error('Error in getProductsByCategoryWithSpecs:', error);
    sendResponse(res, 500, false, null, error.message);
  }
});

export default {
  // Public routes
  getAllProducts,
  getProductsByCategory,
  getProductById,
  getFeaturedProducts,
  getCategories,
  searchProducts,
  
  // Admin routes
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  bulkUpdateProducts,
  getLowStockProducts,
  updateProductStock,
  
  // PC Builder routes
  getProductsByCategoryWithSpecs
};
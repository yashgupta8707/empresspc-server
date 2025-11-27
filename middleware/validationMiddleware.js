// middleware/validationMiddleware.js - Validation middleware for products
import mongoose from 'mongoose';

// Validate MongoDB ObjectId
export const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID parameter is required'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  next();
};

// Validate product input data
export const validateProductInput = (req, res, next) => {
  const { name, brand, category, price, images } = req.body;
  const errors = [];

  // Required field validation
  if (!name || name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }

  if (!brand || brand.trim().length < 2) {
    errors.push('Brand must be at least 2 characters long');
  }

  if (!category || category.trim().length < 2) {
    errors.push('Category is required');
  }

  if (!price || isNaN(price) || parseFloat(price) <= 0) {
    errors.push('Valid price greater than 0 is required');
  }

  // Image URL validation
  if (images && Array.isArray(images)) {
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    
    const invalidImages = images.filter(img => 
      img && !(urlPattern.test(img) && imagePattern.test(img))
    );
    
    if (invalidImages.length > 0) {
      errors.push('All image URLs must be valid and end with image file extensions (.jpg, .png, .gif, .webp, etc.)');
    }

    if (images.filter(img => img && img.trim()).length === 0) {
      errors.push('At least one valid image URL is required');
    }
  } else {
    errors.push('Images array is required');
  }

  // Category validation
  const validCategories = [
    'gaming-pc', 'workstation-pc', 'productivity-pc', 'budget-pc', 
    'creative-pc', 'streaming-pc', 'office-pc', 'mini-pc',
    'processors', 'graphics-cards', 'motherboards', 'memory', 
    'storage', 'power-supplies', 'cases', 'cooling',
    'monitors', 'keyboards', 'mice', 'headsets', 'speakers', 
    'webcams', 'microphones', 'mouse-pads',
    'gaming-laptops', 'business-laptops', 'ultrabooks', 'budget-laptops', 'creative-laptops'
  ];

  if (category && !validCategories.includes(category.toLowerCase())) {
    errors.push('Invalid category selected');
  }

  // Performance validation
  if (req.body.performance) {
    const validPerformance = ['Beast', 'High', 'Regular', 'Basic'];
    if (!validPerformance.includes(req.body.performance)) {
      errors.push('Invalid performance level');
    }
  }

  // Rating validation
  if (req.body.rating) {
    const rating = parseFloat(req.body.rating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      errors.push('Rating must be between 0 and 5');
    }
  }

  // Quantity validation
  if (req.body.quantity !== undefined) {
    const quantity = parseInt(req.body.quantity);
    if (isNaN(quantity) || quantity < 0) {
      errors.push('Quantity must be a non-negative number');
    }
  }

  // Original price validation
  if (req.body.originalPrice) {
    const originalPrice = parseFloat(req.body.originalPrice);
    const currentPrice = parseFloat(price);
    if (isNaN(originalPrice) || originalPrice < currentPrice) {
      errors.push('Original price must be greater than or equal to current price');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate search query parameters
export const validateSearchQuery = (req, res, next) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  if (q.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Search query too long (max 100 characters)'
    });
  }

  next();
};

// Validate pagination parameters
export const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive number'
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }

  next();
};

// Validate bulk operations
export const validateBulkOperation = (req, res, next) => {
  const { productIds, updates } = req.body;
  const errors = [];

  if (!Array.isArray(productIds) || productIds.length === 0) {
    errors.push('Product IDs array is required and cannot be empty');
  } else {
    // Validate all ObjectIds
    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      errors.push('All product IDs must be valid ObjectIds');
    }

    if (productIds.length > 100) {
      errors.push('Cannot update more than 100 products at once');
    }
  }

  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    errors.push('Updates object is required and cannot be empty');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Bulk operation validation failed',
      errors
    });
  }

  next();
};

// Validate stock update
export const validateStockUpdate = (req, res, next) => {
  const { quantity, operation } = req.body;
  const errors = [];

  if (quantity === undefined || quantity === null) {
    errors.push('Quantity is required');
  } else {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      errors.push('Quantity must be a non-negative number');
    }
  }

  if (operation && !['set', 'increment', 'decrement'].includes(operation)) {
    errors.push('Operation must be one of: set, increment, decrement');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Stock update validation failed',
      errors
    });
  }

  next();
};

// Sanitize input data
export const sanitizeInput = (req, res, next) => {
  // Remove any script tags or potentially harmful content
  const sanitizeString = (str) => {
    if (typeof str === 'string') {
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .trim();
    }
    return str;
  };

  const sanitizeObject = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      } else {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
    }
    return sanitizeString(obj);
  };

  req.body = sanitizeObject(req.body);
  next();
};

export default {
  validateObjectId,
  validateProductInput,
  validateSearchQuery,
  validatePagination,
  validateBulkOperation,
  validateStockUpdate,
  sanitizeInput
};
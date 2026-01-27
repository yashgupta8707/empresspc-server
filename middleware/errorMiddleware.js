/**
 * Error Handling Middleware
 * Provides centralized error handling for the Express application
 */

/**
 * Not Found Handler
 * Catches requests to undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global Error Handler
 * Handles all errors passed through next(error)
 */
export const errorHandler = (error, req, res, next) => {
  // Determine status code
  const statusCode = error.status || error.statusCode || 500;

  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error for debugging
  console.error('Error:', {
    message: error.message,
    status: statusCode,
    path: req.path,
    method: req.method,
    ...(isDevelopment && { stack: error.stack })
  });

  // Handle specific error types
  let message = error.message || 'Internal Server Error';

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    message = messages.join(', ');
    return res.status(400).json({
      success: false,
      message,
      errors: isDevelopment ? error.errors : undefined
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    message = 'Invalid ID format';
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    message = field
      ? `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      : 'Duplicate key error';
    return res.status(400).json({
      success: false,
      message
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    return res.status(401).json({
      success: false,
      message
    });
  }

  if (error.name === 'TokenExpiredError') {
    message = 'Token expired';
    return res.status(401).json({
      success: false,
      message
    });
  }

  // Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'File too large. Maximum size is 5MB.';
    return res.status(400).json({
      success: false,
      message
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file upload';
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: isDevelopment ? message : (statusCode === 500 ? 'Internal server error' : message),
    ...(isDevelopment && {
      stack: error.stack,
      path: req.path,
      method: req.method
    })
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  notFoundHandler,
  errorHandler,
  asyncHandler
};

// middleware/auth.js - Enhanced version with better error handling
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Enhanced protect routes - verify JWT token
export const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.header('Authorization')) {
      // Fallback: check for direct Authorization header
      token = req.header('Authorization').replace('Bearer ', '');
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if user is active (if your User model has isActive field)
      if (user.isActive === false) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated. Please contact support.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token.',
          code: 'INVALID_TOKEN'
        });
      } else if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Token has expired.',
          code: 'TOKEN_EXPIRED'
        });
      } else {
        throw tokenError;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      code: 'AUTH_ERROR'
    });
  }
};

// Enhanced admin role check middleware
export const adminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check for admin role - supports both isAdmin boolean and role string
    const isAdmin = req.user.isAdmin || req.user.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in admin authorization',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.header('Authorization')) {
      token = req.header('Authorization').replace('Bearer ', '');
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive !== false) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // Don't fail, just set user to null
      req.user = null;
    }

    next();
  } catch (error) {
    // Don't fail, just set user to null
    req.user = null;
    next();
  }
};

// Enhanced role-based access control
export const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Normalize roles to array
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Get user roles - support both single role and array of roles
      let userRoles = [];
      if (req.user.role) {
        userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
      }
      
      // Add legacy isAdmin support
      if (req.user.isAdmin) {
        userRoles.push('admin');
      }

      const hasRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
          code: 'ROLE_REQUIRED',
          requiredRoles,
          userRoles
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in role authorization',
        code: 'ROLE_AUTH_ERROR'
      });
    }
  };
};

// Check if user owns resource or is admin
export const resourceOwner = (resourceUserField = 'user') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin can access any resource
      const isAdmin = req.user.isAdmin || req.user.role === 'admin';
      if (isAdmin) {
        return next();
      }

      // Check if user owns the resource
      const resource = req.resource; // Should be set by previous middleware
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      const resourceUserId = resource[resourceUserField]?.toString();
      const currentUserId = req.user._id.toString();

      if (resourceUserId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Resource owner middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in resource authorization',
        code: 'RESOURCE_AUTH_ERROR'
      });
    }
  };
};

// Middleware to check if user is verified (if your app has email verification)
export const requireVerified = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Verification middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in verification check',
      code: 'VERIFICATION_ERROR'
    });
  }
};

// Rate limiting middleware for auth routes
export const authRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requests.has(ip)) {
      requests.set(ip, requests.get(ip).filter(time => time > windowStart));
    } else {
      requests.set(ip, []);
    }
    
    const requestTimes = requests.get(ip);
    
    if (requestTimes.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    requestTimes.push(now);
    next();
  };
};

// Middleware to log authentication events
export const authLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/register')) {
        console.log('Auth Event:', {
          timestamp: new Date().toISOString(),
          ip: req.ip || req.connection.remoteAddress,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          success: responseData.success || false,
          userId: req.user?._id || 'anonymous',
          message: responseData.message || 'No message'
        });
      }
    } catch (error) {
      console.error('Auth logging error:', error);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware to check account status (suspended, banned, etc.)
export const checkAccountStatus = (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // Let other middleware handle authentication
    }

    // Check if account is suspended
    if (req.user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Check if account is banned
    if (req.user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Account has been banned.',
        code: 'ACCOUNT_BANNED'
      });
    }

    // Check if account requires password change
    if (req.user.requirePasswordChange && !req.path.includes('/change-password')) {
      return res.status(403).json({
        success: false,
        message: 'Password change required.',
        code: 'PASSWORD_CHANGE_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Account status check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in account status check',
      code: 'ACCOUNT_STATUS_ERROR'
    });
  }
};

// Middleware to validate JWT token without authentication requirement
export const validateToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      req.user = user;
      return res.json({
        success: true,
        message: 'Token is valid',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role || (user.isAdmin ? 'admin' : 'user'),
          isAdmin: user.isAdmin || false
        }
      });
    } catch (tokenError) {
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else {
        throw tokenError;
      }
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in token validation',
      code: 'TOKEN_VALIDATION_ERROR'
    });
  }
};

// Export all middleware functions
export default {
  auth,
  adminAuth,
  optionalAuth,
  requireRole,
  resourceOwner,
  requireVerified,
  authRateLimit,
  authLogger,
  checkAccountStatus,
  validateToken
};
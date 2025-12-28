// Security Middleware for Empress Tech Backend
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Enhanced Helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust for production
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  frameguard: { action: 'deny' }
});

// Rate limiting configurations
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 orders per hour per IP
  message: {
    success: false,
    message: 'Too many orders created, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          // Remove potential XSS attacks
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Request logging for security monitoring
export const securityLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log suspicious activities
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('⚠️ Security Event:', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        statusCode: res.statusCode,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
    }

    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.warn('⏱️ Slow Request:', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        ip: req.ip
      });
    }
  });

  next();
};

// CORS security middleware
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5174',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// JWT Token validation helper
export const validateToken = (token) => {
  if (!token) return { valid: false, error: 'No token provided' };

  // Check token format
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  return { valid: true };
};

// Password strength validator
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: errors.length === 0 ? 'strong' :
              errors.length <= 2 ? 'medium' : 'weak'
  };
};

// File upload security
export const validateFileUpload = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const errors = [];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed');
  }

  if (file.size > maxSize) {
    errors.push('File size exceeds 5MB limit');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  securityHeaders,
  apiLimiter,
  authLimiter,
  createOrderLimiter,
  sanitizeInput,
  securityLogger,
  corsOptions,
  validateToken,
  validatePasswordStrength,
  validateFileUpload
};

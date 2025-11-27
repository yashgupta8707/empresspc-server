// models/Deal.js - Complete fixed version with all static methods
import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Deal title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Deal description is required'],
    trim: true,
    maxLength: [300, 'Description cannot exceed 300 characters']
  },
  
  // Product Details
  product: {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    
    specifications: {
      type: [{
        label: {
          type: String,
          required: true,
          trim: true
        },
        value: {
          type: String,
          required: true,
          trim: true
        }
      }],
      default: []
    },
    
    features: {
      type: [String],
      default: []
    }
  },
  
  // Pricing
  pricing: {
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Price cannot be negative']
    },
    
    salePrice: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: [0, 'Price cannot be negative']
    },
    
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    
    emiStarting: {
      type: Number,
      min: [0, 'EMI cannot be negative'],
      default: 0
    }
  },
  
  // Images (Cloudinary) - Make main image optional for draft deals
  images: {
    main: {
      url: {
        type: String,
        default: '/images/default-product.png'
      },
      publicId: {
        type: String,
        default: 'default'
      },
      alt: {
        type: String,
        default: ''
      }
    },
    
    gallery: {
      type: [{
        url: {
          type: String,
          required: true
        },
        publicId: {
          type: String,
          required: true
        },
        alt: {
          type: String,
          default: ''
        }
      }],
      default: []
    }
  },
  
  // Deal Timing
  dealTiming: {
    startDate: {
      type: Date,
      required: [true, 'Deal start date is required']
    },
    
    endDate: {
      type: Date,
      required: [true, 'Deal end date is required']
    },
    
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  
  // Deal Status
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'paused'],
    default: 'draft'
  },
  
  // Marketing Details
  marketing: {
    badgeText: {
      type: String,
      default: 'DEAL OF THE DAY',
      maxLength: [50, 'Badge text cannot exceed 50 characters']
    },
    
    urgencyText: {
      type: String,
      default: 'Limited time offer',
      maxLength: [100, 'Urgency text cannot exceed 100 characters']
    },
    
    highlights: {
      type: [{
        icon: {
          type: String,
          enum: ['Star', 'Shield', 'Clock', 'Zap', 'Award', 'Check'],
          required: true
        },
        text: {
          type: String,
          required: true,
          maxLength: [50, 'Highlight text cannot exceed 50 characters']
        },
        value: {
          type: String,
          required: true,
          maxLength: [30, 'Highlight value cannot exceed 30 characters']
        }
      }],
      default: [
        { icon: 'Star', text: 'Customer Rating', value: '4.9/5' },
        { icon: 'Shield', text: 'Warranty', value: '3 Years' }
      ]
    }
  },
  
  // SEO & Analytics
  seo: {
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    
    metaTitle: {
      type: String,
      default: ''
    },
    
    metaDescription: {
      type: String,
      default: ''
    }
  },
  
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    
    clicks: {
      type: Number,
      default: 0
    },
    
    conversions: {
      type: Number,
      default: 0
    }
  },
  
  // Admin Details
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Priority for display order
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  // Related product reference (if exists)
  relatedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
dealSchema.index({ status: 1, priority: -1 });
dealSchema.index({ 'dealTiming.startDate': 1, 'dealTiming.endDate': 1 });
dealSchema.index({ 'seo.slug': 1 });
dealSchema.index({ createdAt: -1 });

// Virtual for discount percentage
dealSchema.virtual('discountPercentage').get(function() {
  if (this.pricing.originalPrice > 0) {
    return Math.round(((this.pricing.originalPrice - this.pricing.salePrice) / this.pricing.originalPrice) * 100);
  }
  return 0;
});

// Virtual for savings amount
dealSchema.virtual('savingsAmount').get(function() {
  return this.pricing.originalPrice - this.pricing.salePrice;
});

// Virtual for deal status based on dates
dealSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'draft' || this.status === 'paused') {
    return this.status;
  }
  
  if (now < this.dealTiming.startDate) {
    return 'upcoming';
  }
  
  if (now > this.dealTiming.endDate) {
    return 'expired';
  }
  
  return 'active';
});

// Virtual for time remaining
dealSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.dealTiming.endDate);
  
  if (now >= endDate) {
    return { expired: true };
  }
  
  const diff = endDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, expired: false };
});

// Custom validation for pricing
dealSchema.pre('validate', function(next) {
  if (this.pricing && this.pricing.salePrice >= this.pricing.originalPrice) {
    next(new Error('Sale price must be less than original price'));
  } else {
    next();
  }
});

// Custom validation for dates
dealSchema.pre('validate', function(next) {
  if (this.dealTiming && this.dealTiming.endDate <= this.dealTiming.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Pre-save middleware to generate slug and set defaults
dealSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.seo.slug && this.title) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }
  
  // Auto-generate meta title if not provided
  if (!this.seo.metaTitle && this.title) {
    this.seo.metaTitle = `${this.title} - Special Deal | Empress Tech`;
  }
  
  // Auto-generate meta description if not provided
  if (!this.seo.metaDescription && this.description) {
    this.seo.metaDescription = this.description.substring(0, 150) + '...';
  }
  
  next();
});

// ============= STATIC METHODS =============

// Static method to get active deals
dealSchema.statics.getActiveDeals = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    'dealTiming.startDate': { $lte: now },
    'dealTiming.endDate': { $gte: now }
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get current deal of the day - THIS WAS MISSING!
dealSchema.statics.getCurrentDeal = function() {
  const now = new Date();
  return this.findOne({
    status: 'active',
    'dealTiming.startDate': { $lte: now },
    'dealTiming.endDate': { $gte: now }
  }).sort({ priority: -1, createdAt: -1 });
};

// ============= INSTANCE METHODS =============

// Instance method to increment views
dealSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

// Instance method to increment clicks
dealSchema.methods.incrementClicks = function() {
  this.analytics.clicks += 1;
  return this.save();
};

// Instance method to increment conversions
dealSchema.methods.incrementConversions = function() {
  this.analytics.conversions += 1;
  return this.save();
};

// Instance method to check if deal is currently active
dealSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.dealTiming.startDate && 
         now <= this.dealTiming.endDate;
};

// Pre-remove middleware to clean up Cloudinary images
dealSchema.pre('remove', async function(next) {
  try {
    // Only attempt to import and use cloudinary if images exist
    if (this.images?.main?.publicId && this.images.main.publicId !== 'default') {
      try {
        const cloudinary = await import('../config/cloudinary.js');
        await cloudinary.deleteFromCloudinary(this.images.main.publicId);
      } catch (err) {
        console.error('Error deleting main image:', err);
      }
    }
    
    // Delete gallery images
    if (this.images?.gallery && this.images.gallery.length > 0) {
      try {
        const cloudinary = await import('../config/cloudinary.js');
        for (const image of this.images.gallery) {
          if (image.publicId) {
            await cloudinary.deleteFromCloudinary(image.publicId);
          }
        }
      } catch (err) {
        console.error('Error deleting gallery images:', err);
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in pre-remove middleware:', error);
    next(); // Continue with deletion even if image cleanup fails
  }
});

const Deal = mongoose.model('Deal', dealSchema);

export default Deal;
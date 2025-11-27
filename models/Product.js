// models/Product.js - Enhanced optimized version with image URLs
import mongoose from 'mongoose';

const productSchema = mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: true
  },
  brand: { 
    type: String, 
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters'],
    index: true
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    trim: true,
    lowercase: true,
    index: true,
    enum: {
      values: [
        // PC Categories
        'gaming-pc', 'workstation-pc', 'productivity-pc', 'budget-pc', 
        'creative-pc', 'streaming-pc', 'office-pc', 'mini-pc',
        
        // Component Categories
        'processors', 'graphics-cards', 'motherboards', 'memory', 
        'storage', 'power-supplies', 'cases', 'cooling',
        
        // Peripheral Categories
        'monitors', 'keyboards', 'mice', 'headsets', 'speakers', 
        'webcams', 'microphones', 'mouse-pads',
        
        // Laptop Categories
        'gaming-laptops', 'business-laptops', 'ultrabooks', 'budget-laptops', 'creative-laptops'
      ],
      message: 'Invalid category'
    }
  },
  subCategory: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    index: true
  },
  originalPrice: { 
    type: Number,
    min: [0, 'Original price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value >= this.price;
      },
      message: 'Original price should be greater than or equal to current price'
    }
  },
  
  // Enhanced specification system
  specifications: [{
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    items: [{
      label: {
        type: String,
        required: true,
        trim: true,
        index: true
      },
      value: {
        type: String,
        required: true,
        trim: true,
        index: true
      },
      unit: {
        type: String,
        trim: true
      }
    }]
  }],
  
  // Key features as bullet points
  keyFeatures: [{
    type: String,
    trim: true,
    maxlength: [200, 'Feature description cannot exceed 200 characters']
  }],

  // Image URLs instead of file uploads
  images: [{
    type: String,
    required: [true, 'At least one image URL is required'],
    validate: {
      validator: function(url) {
        // Basic URL validation
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
        return urlPattern.test(url) && imagePattern.test(url);
      },
      message: 'Please provide a valid image URL'
    }
  }],
  
  // Keep the existing specs Map for backward compatibility
  specs: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  badge: {
    text: { 
      type: String, 
      default: 'New',
      maxlength: [20, 'Badge text cannot exceed 20 characters'],
      trim: true
    },
    color: { 
      type: String, 
      default: 'bg-blue-500',
      enum: {
        values: [
          'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 
          'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-orange-500',
          'bg-cyan-500', 'bg-gray-500'
        ],
        message: 'Invalid badge color'
      }
    }
  },
  quantity: { 
    type: Number, 
    default: 0,
    min: [0, 'Quantity cannot be negative'],
    index: true
  },
  colors: [{
    type: String,
    trim: true
  }],
  sizes: [{
    type: String,
    trim: true
  }],
  rating: { 
    type: Number, 
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    index: true
  },
  reviews: { 
    type: Number, 
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    }
  },
  performance: {
    type: String,
    enum: ['Beast', 'High', 'Regular', 'Basic'],
    default: 'Regular',
    index: true
  },
  useCase: [{
    type: String,
    enum: [
      'Gaming', 'Video Editing', '3D Rendering', 'Development', 
      'Design', 'Office Work', 'Content Creation', 'Streaming',
      'Programming', 'Data Analysis', 'CAD', 'Animation'
    ],
    index: true
  }],
  compatibility: [{
    type: String,
    trim: true
  }],
  warrantyPeriod: {
    type: Number,
    default: 12,
    min: [0, 'Warranty period cannot be negative']
  },
  priceHistory: [{
    price: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  minStockLevel: {
    type: Number,
    default: 5,
    min: [0, 'Minimum stock level cannot be negative']
  },
  maxStockLevel: {
    type: Number,
    default: 100,
    min: [0, 'Maximum stock level cannot be negative'],
    validate: {
      validator: function(value) {
        return value >= this.minStockLevel;
      },
      message: 'Maximum stock level should be greater than minimum stock level'
    }
  },
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title cannot exceed 60 characters'],
    trim: true
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true
  },
  manufacturer: {
    type: String,
    trim: true,
    index: true
  },
  model: {
    type: String,
    trim: true,
    index: true
  },
  releaseDate: {
    type: Date
  },
  
  // Analytics fields
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  clicks: {
    type: Number,
    default: 0,
    min: 0
  },
  addToCartCount: {
    type: Number,
    default: 0,
    min: 0
  },
  purchaseCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // PC Builder specifications (for future use)
  pcBuilderSpecs: {
    platform: {
      type: String,
      enum: ['intel', 'amd', 'universal'],
      lowercase: true
    },
    compatibility: {
      processorSocket: String,
      memoryType: String,
      gpuInterface: String,
      powerRequirement: Number
    },
    priceTracking: {
      lastPriceUpdate: Date,
      priceSource: String,
      sheetRowId: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Enhanced indexes for better performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ subCategory: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ rating: -1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ performance: 1, category: 1 });
productSchema.index({ useCase: 1, isActive: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ 'specifications.category': 1 });
productSchema.index({ 'specifications.items.label': 1 });
productSchema.index({ views: -1 });
productSchema.index({ purchaseCount: -1 });

// Text search index
productSchema.index({ 
  name: 'text', 
  brand: 'text', 
  'keyFeatures': 'text',
  'specifications.items.label': 'text',
  'specifications.items.value': 'text'
});

// Compound indexes for complex queries
productSchema.index({ category: 1, price: 1, isActive: 1 });
productSchema.index({ brand: 1, category: 1, isActive: 1 });
productSchema.index({ performance: 1, price: 1, isActive: 1 });

// Virtuals
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

productSchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out-of-stock';
  if (this.quantity <= this.minStockLevel) return 'low-stock';
  return 'in-stock';
});

productSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.quantity > 0;
});

productSchema.virtual('savingsAmount').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return this.originalPrice - this.price;
  }
  return 0;
});

productSchema.virtual('averageRating').get(function() {
  return this.rating || 0;
});

productSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(this.price);
});

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Generate SKU if not provided
  if (!this.sku) {
    const categoryCode = this.category.substring(0, 3).toUpperCase();
    const brandCode = this.brand.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.sku = `${categoryCode}-${brandCode}-${randomNum}`;
  }
  
  // Generate slug if not provided
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Ensure meta fields are set
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  
  if (!this.metaDescription) {
    let metaDesc = '';
    if (this.keyFeatures && this.keyFeatures.length > 0) {
      metaDesc = this.keyFeatures.slice(0, 2).join('. ');
    } else {
      metaDesc = `${this.brand} ${this.name}`;
    }
    this.metaDescription = metaDesc.substring(0, 160);
  }
  
  // Clean up arrays - remove empty values
  if (this.images) {
    this.images = this.images.filter(img => img && img.trim() !== '');
  }
  if (this.colors) {
    this.colors = this.colors.filter(color => color && color.trim() !== '');
  }
  if (this.sizes) {
    this.sizes = this.sizes.filter(size => size && size.trim() !== '');
  }
  if (this.tags) {
    this.tags = this.tags.filter(tag => tag && tag.trim() !== '');
  }
  if (this.useCase) {
    this.useCase = this.useCase.filter(use => use && use.trim() !== '');
  }
  if (this.compatibility) {
    this.compatibility = this.compatibility.filter(comp => comp && comp.trim() !== '');
  }
  if (this.keyFeatures) {
    this.keyFeatures = this.keyFeatures.filter(feature => feature && feature.trim() !== '');
  }
  
  // Clean up specifications
  if (this.specifications) {
    this.specifications = this.specifications.filter(spec => 
      spec.category && spec.category.trim() !== '' && 
      spec.items && spec.items.length > 0
    );
    
    this.specifications.forEach(spec => {
      spec.items = spec.items.filter(item => 
        item.label && item.label.trim() !== '' && 
        item.value && item.value.trim() !== ''
      );
    });
    
    // Remove specification categories with no items
    this.specifications = this.specifications.filter(spec => spec.items.length > 0);
  }
  
  // Update price history
  if (this.isModified('price')) {
    this.priceHistory.push({
      price: this.price,
      date: new Date()
    });
    
    // Keep only last 50 price changes
    if (this.priceHistory.length > 50) {
      this.priceHistory = this.priceHistory.slice(-50);
    }
  }
  
  // Validate image URLs
  if (this.images && this.images.length > 0) {
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    
    const invalidImages = this.images.filter(img => 
      !(urlPattern.test(img) && imagePattern.test(img))
    );
    
    if (invalidImages.length > 0) {
      return next(new Error('Invalid image URLs detected. Please provide valid image URLs.'));
    }
  }
  
  next();
});

// Post-save middleware for analytics
productSchema.post('save', function(doc, next) {
  // Update category analytics or other post-save operations
  next();
});

// Static methods
productSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, isActive: true };
  return this.find(query, null, options);
};

productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isActive: true }).limit(limit);
};

productSchema.statics.findByPriceRange = function(minPrice, maxPrice, options = {}) {
  return this.find({ 
    price: { $gte: minPrice, $lte: maxPrice }, 
    isActive: true 
  }, null, options);
};

productSchema.statics.findLowStock = function() {
  return this.find({
    $expr: { $lte: ['$quantity', '$minStockLevel'] },
    isActive: true
  });
};

productSchema.statics.findBySpecification = function(specName, specValue) {
  return this.find({
    'specifications.items': {
      $elemMatch: {
        label: new RegExp(specName, 'i'),
        value: new RegExp(specValue, 'i')
      }
    },
    isActive: true
  });
};

productSchema.statics.searchProducts = function(searchTerm, options = {}) {
  const searchQuery = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { brand: { $regex: searchTerm, $options: 'i' } },
          { 'keyFeatures': { $in: [new RegExp(searchTerm, 'i')] } },
          { 'specifications.items.label': { $regex: searchTerm, $options: 'i' } },
          { 'specifications.items.value': { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      }
    ]
  };
  
  return this.find(searchQuery, null, options);
};

productSchema.statics.getProductStats = function() {
  return this.aggregate([
    {
      $facet: {
        totalProducts: [{ $count: "count" }],
        activeProducts: [{ $match: { isActive: true } }, { $count: "count" }],
        inStockProducts: [{ $match: { isActive: true, quantity: { $gt: 0 } } }, { $count: "count" }],
        outOfStockProducts: [{ $match: { isActive: true, quantity: { $lte: 0 } } }, { $count: "count" }],
        categoryStats: [
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        brandStats: [
          { $match: { isActive: true } },
          { $group: { _id: '$brand', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        priceStats: [
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
        ]
      }
    }
  ]);
};

// Instance methods
productSchema.methods.incrementView = function() {
  this.views += 1;
  return this.save();
};

productSchema.methods.incrementClick = function() {
  this.clicks += 1;
  return this.save();
};

productSchema.methods.incrementAddToCart = function() {
  this.addToCartCount += 1;
  return this.save();
};

productSchema.methods.incrementPurchase = function() {
  this.purchaseCount += 1;
  return this.save();
};

productSchema.methods.updateStock = function(quantity) {
  this.quantity = Math.max(0, quantity);
  return this.save();
};

productSchema.methods.getFormattedSpecifications = function() {
  const formatted = {};
  
  if (this.specifications && this.specifications.length > 0) {
    this.specifications.forEach(spec => {
      formatted[spec.category] = spec.items.map(item => ({
        label: item.label,
        value: item.unit ? `${item.value} ${item.unit}` : item.value
      }));
    });
  }
  
  return formatted;
};

productSchema.methods.isOnSale = function() {
  return this.originalPrice && this.originalPrice > this.price;
};

productSchema.methods.canPurchase = function(requestedQuantity = 1) {
  return this.isActive && this.quantity >= requestedQuantity;
};

// Error handling
productSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    if (error.keyPattern.sku) {
      next(new Error('SKU already exists'));
    } else if (error.keyPattern.slug) {
      next(new Error('Product slug already exists'));
    } else {
      next(new Error('Duplicate key error'));
    }
  } else {
    next(error);
  }
});

const Product = mongoose.model('Product', productSchema);

export default Product;
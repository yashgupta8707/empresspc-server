// models/PCConfiguration.js
import mongoose from 'mongoose';

const pcConfigurationSchema = mongoose.Schema({
  configName: {
    type: String,
    required: [true, 'Configuration name is required'],
    trim: true,
    maxlength: [100, 'Configuration name cannot exceed 100 characters']
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  sessionId: {
    type: String,
    trim: true
  },
  
  platform: {
    type: String,
    enum: ['intel', 'amd'],
    required: [true, 'Platform selection is required']
  },
  
  useCase: {
    type: String,
    enum: [
      'Gaming', 'Video Editing', '3D Rendering', 'Development', 
      'Design', 'Office Work', 'Content Creation', 'Streaming',
      'Programming', 'Data Analysis', 'CAD', 'Animation', 'General'
    ],
    default: 'General'
  },
  
  budget: {
    min: { type: Number, min: [0, 'Minimum budget cannot be negative'] },
    max: { type: Number, min: [0, 'Maximum budget cannot be negative'] },
    target: { type: Number, min: [0, 'Target budget cannot be negative'] }
  },
  
  components: {
    processor: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    },
    
    motherboard: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    },
    
    memory: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    },
    
    graphicsCard: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    },
    
    storage: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      isPrimary: { type: Boolean, default: false },
      selectedAt: { type: Date, default: Date.now }
    }],
    
    powerSupply: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    },
    
    pcCase: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    },
    
    cooling: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: {
        name: String,
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: { type: Number, default: 1, min: 1 },
      selectedAt: { type: Date, default: Date.now }
    }
  },
  
  pricing: {
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  compatibility: {
    isValid: { type: Boolean, default: true },
    issues: [{
      severity: {
        type: String,
        enum: ['error', 'warning', 'info'],
        required: true
      },
      component1: String,
      component2: String,
      message: String,
      code: String,
      autoFix: String,
      detectedAt: { type: Date, default: Date.now }
    }],
    warnings: [{
      type: String,
      message: String,
      component: String
    }],
    lastChecked: { type: Date, default: Date.now }
  },
  
  status: {
    type: String,
    enum: ['draft', 'completed', 'ordered', 'saved'],
    default: 'draft'
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes
pcConfigurationSchema.index({ userId: 1, platform: 1 });
pcConfigurationSchema.index({ sessionId: 1 });
pcConfigurationSchema.index({ platform: 1, useCase: 1 });
pcConfigurationSchema.index({ 'pricing.total': 1 });
pcConfigurationSchema.index({ status: 1, isPublic: 1 });

// Virtual for component count
pcConfigurationSchema.virtual('componentCount').get(function() {
  let count = 0;
  const components = this.components;
  
  Object.keys(components).forEach(key => {
    if (key === 'storage') {
      count += components[key].length;
    } else if (components[key] && components[key].productId) {
      count += 1;
    }
  });
  
  return count;
});

// Instance methods
pcConfigurationSchema.methods.updatePricing = function() {
  let subtotal = 0;
  const components = this.components;
  
  // Calculate subtotal
  Object.keys(components).forEach(key => {
    if (key === 'storage') {
      components[key].forEach(storage => {
        if (storage.product && storage.product.price) {
          subtotal += storage.product.price * storage.quantity;
        }
      });
    } else if (components[key] && components[key].product && components[key].product.price) {
      subtotal += components[key].product.price * components[key].quantity;
    }
  });
  
  this.pricing.subtotal = subtotal;
  this.pricing.tax = Math.round(subtotal * 0.18); // 18% GST in India
  this.pricing.total = this.pricing.subtotal + this.pricing.tax + this.pricing.shipping - this.pricing.discount;
  this.pricing.lastUpdated = new Date();
  
  return this.pricing.total;
};

pcConfigurationSchema.methods.addComponent = function(componentType, product, quantity = 1) {
  if (componentType === 'storage') {
    this.components.storage.push({
      productId: product._id,
      product: {
        name: product.name,
        brand: product.brand,
        model: product.model,
        price: product.price,
        image: product.images[0]
      },
      quantity: quantity,
      isPrimary: this.components.storage.length === 0,
      selectedAt: new Date()
    });
  } else {
    this.components[componentType] = {
      productId: product._id,
      product: {
        name: product.name,
        brand: product.brand,
        model: product.model,
        price: product.price,
        image: product.images[0]
      },
      quantity: quantity,
      selectedAt: new Date()
    };
  }
  
  this.updatePricing();
  return this;
};

pcConfigurationSchema.methods.removeComponent = function(componentType, storageIndex = null) {
  if (componentType === 'storage' && storageIndex !== null) {
    this.components.storage.splice(storageIndex, 1);
  } else {
    this.components[componentType] = {};
  }
  
  this.updatePricing();
  return this;
};

pcConfigurationSchema.methods.getCompatibilityStatus = function() {
  // This would be expanded with actual compatibility checking logic
  const issues = [];
  const warnings = [];
  
  // Basic checks
  if (this.components.processor.productId && this.components.motherboard.productId) {
    // Check socket compatibility (would need to populate products first)
    // This is a simplified example
  }
  
  this.compatibility.issues = issues;
  this.compatibility.warnings = warnings;
  this.compatibility.isValid = issues.filter(i => i.severity === 'error').length === 0;
  this.compatibility.lastChecked = new Date();
  
  return this.compatibility;
};

// Static methods
pcConfigurationSchema.statics.findByPlatform = function(platform) {
  return this.find({ platform, isPublic: true });
};

pcConfigurationSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ updatedAt: -1 });
};

pcConfigurationSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId }).sort({ updatedAt: -1 });
};

// Pre-save middleware
pcConfigurationSchema.pre('save', function(next) {
  this.updatePricing();
  this.getCompatibilityStatus();
  next();
});

pcConfigurationSchema.set('toJSON', { virtuals: true });
pcConfigurationSchema.set('toObject', { virtuals: true });

const PCConfiguration = mongoose.model('PCConfiguration', pcConfigurationSchema);
export default PCConfiguration;
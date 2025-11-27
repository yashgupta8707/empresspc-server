// models/Slide.js - Mongoose model for carousel slides
import mongoose from 'mongoose';

const slideSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Slide ID is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxLength: [50, 'Slide ID cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Slide ID can only contain letters, numbers, hyphens, and underscores']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters'],
    minLength: [5, 'Title must be at least 5 characters long']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters'],
    minLength: [10, 'Description must be at least 10 characters long']
  },
  image: {
    type: String,
    required: [true, 'Image is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    required: true,
    default: 1,
    min: [1, 'Order must be at least 1'],
    max: [100, 'Order cannot exceed 100']
  },
  buttonText: {
    type: String,
    trim: true,
    maxLength: [30, 'Button text cannot exceed 30 characters'],
    default: 'View More'
  },
  buttonLink: {
    type: String,
    trim: true,
    maxLength: [200, 'Button link cannot exceed 200 characters']
  },
  category: {
    type: String,
    trim: true,
    maxLength: [50, 'Category cannot exceed 50 characters']
  },
  // Analytics fields
  views: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  // SEO fields
  altText: {
    type: String,
    trim: true,
    maxLength: [100, 'Alt text cannot exceed 100 characters']
  },
  // Admin fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
slideSchema.index({ order: 1, isActive: 1 });
slideSchema.index({ id: 1 });
slideSchema.index({ isActive: 1 });
slideSchema.index({ createdAt: -1 });

// Virtual for click-through rate
slideSchema.virtual('clickThroughRate').get(function() {
  return this.views > 0 ? ((this.clicks / this.views) * 100).toFixed(2) : 0;
});

// Virtual for formatted created date
slideSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Pre-save middleware to handle order conflicts
slideSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('order')) {
    // Check if order already exists
    const existingSlide = await this.constructor.findOne({
      order: this.order,
      _id: { $ne: this._id }
    });
    
    if (existingSlide) {
      // Find the next available order
      const slides = await this.constructor.find({}).sort({ order: 1 });
      let nextOrder = 1;
      
      for (const slide of slides) {
        if (slide.order === nextOrder && slide._id.toString() !== this._id.toString()) {
          nextOrder++;
        } else {
          break;
        }
      }
      
      this.order = nextOrder;
    }
  }
  next();
});

// Static method to get active slides
slideSchema.statics.getActiveSlides = function() {
  return this.find({ isActive: true }).sort({ order: 1 });
};

// Static method to get slides by category
slideSchema.statics.getSlidesByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ order: 1 });
};

// Static method to get next order number
slideSchema.statics.getNextOrder = async function() {
  const lastSlide = await this.findOne().sort({ order: -1 });
  return lastSlide ? lastSlide.order + 1 : 1;
};

// Instance method to increment views
slideSchema.methods.incrementViews = function() {
  this.views = (this.views || 0) + 1;
  return this.save();
};

// Instance method to increment clicks
slideSchema.methods.incrementClicks = function() {
  this.clicks = (this.clicks || 0) + 1;
  return this.save();
};

// Instance method to toggle active status
slideSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

const Slide = mongoose.model('Slide', slideSchema);

export default Slide;
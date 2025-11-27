// models/Testimonial.js - Fixed version that prevents re-compilation
import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// Define the schema
const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        if (!email) return true; // Allow empty email
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  title: {
    type: String,
    required: [true, 'Testimonial title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Testimonial content is required'],
    trim: true,
    maxlength: [2000, 'Content cannot exceed 2000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(rating) {
        // Allow ratings like 4.5, 3.5, etc.
        return rating % 0.5 === 0;
      },
      message: 'Rating must be in increments of 0.5'
    }
  },
  // Image fields
  img: {
    type: String,
    default: null
  },
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  
  // Additional fields
  purchaseDate: {
    type: Date,
    default: null
  },
  productPurchased: {
    type: String,
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  
  // Status fields
  verified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Admin fields
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Tracking fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add mongoose-paginate-v2 plugin
testimonialSchema.plugin(mongoosePaginate);

// Indexes for better query performance
testimonialSchema.index({ isActive: 1, verified: 1 });
testimonialSchema.index({ rating: -1 });
testimonialSchema.index({ createdAt: -1 });
testimonialSchema.index({ featured: -1, displayOrder: -1, createdAt: -1 });
testimonialSchema.index({ name: 'text', title: 'text', content: 'text' });

// Virtual for display rating with stars
testimonialSchema.virtual('displayRating').get(function() {
  const fullStars = Math.floor(this.rating);
  const hasHalfStar = this.rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(this.rating);
  
  return {
    full: fullStars,
    half: hasHalfStar,
    empty: emptyStars,
    value: this.rating
  };
});

// Virtual for formatted date
testimonialSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Method to get testimonial for public display
testimonialSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    name: this.name,
    location: this.location,
    title: this.title,
    content: this.content,
    rating: this.rating,
    displayRating: this.displayRating,
    img: this.img,
    purchaseDate: this.purchaseDate,
    productPurchased: this.productPurchased,
    verified: this.verified,
    featured: this.featured,
    createdAt: this.createdAt,
    formattedDate: this.formattedDate
  };
};

// Static method to get active testimonials for frontend
testimonialSchema.statics.getActiveTestimonials = function(options = {}) {
  const { 
    limit = null, 
    featured = null, 
    minRating = null,
    sort = { featured: -1, displayOrder: -1, createdAt: -1 }
  } = options;
  
  let query = { isActive: true };
  
  if (featured !== null) {
    query.featured = featured;
  }
  
  if (minRating) {
    query.rating = { $gte: minRating };
  }
  
  const mongoQuery = this.find(query).sort(sort);
  
  return limit ? mongoQuery.limit(limit) : mongoQuery;
};

// Static method to get testimonials with comprehensive statistics
testimonialSchema.statics.getTestimonialsWithStats = async function() {
  const testimonials = await this.find().sort({ createdAt: -1 });
  
  const totalRating = testimonials.reduce((acc, t) => acc + t.rating, 0);
  const avgRating = testimonials.length > 0 ? totalRating / testimonials.length : 0;
  
  const stats = {
    total: testimonials.length,
    active: testimonials.filter(t => t.isActive).length,
    inactive: testimonials.filter(t => !t.isActive).length,
    verified: testimonials.filter(t => t.verified).length,
    unverified: testimonials.filter(t => !t.verified).length,
    featured: testimonials.filter(t => t.featured).length,
    avgRating: parseFloat(avgRating.toFixed(1)),
    totalRating,
    ratingDistribution: {
      5: testimonials.filter(t => t.rating === 5).length,
      4.5: testimonials.filter(t => t.rating === 4.5).length,
      4: testimonials.filter(t => t.rating === 4).length,
      3.5: testimonials.filter(t => t.rating === 3.5).length,
      3: testimonials.filter(t => t.rating === 3).length,
      2.5: testimonials.filter(t => t.rating === 2.5).length,
      2: testimonials.filter(t => t.rating === 2).length,
      1.5: testimonials.filter(t => t.rating === 1.5).length,
      1: testimonials.filter(t => t.rating === 1).length
    },
    monthlyStats: await this.getMonthlyStats()
  };
  
  return { testimonials, stats };
};

// Static method to get monthly statistics
testimonialSchema.statics.getMonthlyStats = async function() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        verifiedCount: {
          $sum: { $cond: ['$verified', 1, 0] }
        },
        featuredCount: {
          $sum: { $cond: ['$featured', 1, 0] }
        }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12
    },
    {
      $project: {
        _id: 1,
        count: 1,
        avgRating: { $round: ['$avgRating', 1] },
        activeCount: 1,
        verifiedCount: 1,
        featuredCount: 1,
        monthName: {
          $arrayElemAt: [
            ['', 'January', 'February', 'March', 'April', 'May', 'June',
             'July', 'August', 'September', 'October', 'November', 'December'],
            '$_id.month'
          ]
        }
      }
    }
  ]);
};

// Pre-save middleware to handle display order
testimonialSchema.pre('save', async function(next) {
  if (this.isNew && this.displayOrder === 0) {
    const maxOrder = await this.constructor.findOne({}, 'displayOrder').sort({ displayOrder: -1 });
    this.displayOrder = (maxOrder?.displayOrder || 0) + 1;
  }
  next();
});

// Check if model already exists and use it, otherwise create new one
const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;
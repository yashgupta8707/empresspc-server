// models/Blog.js - Updated with enhanced slug handling and validation
import mongoose from 'mongoose';

const blogSchema = mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: { 
    type: String, 
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  summary: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  image: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        // Basic URL validation
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Image must be a valid URL'
    }
  },
  category: { 
    type: String, 
    required: true,
    enum: ['nvidia', 'tech', 'computing', 'mobile', 'gadget', 'technology', 'news', 'design', 'ai', 'article'],
    lowercase: true
  },
  type: {
    type: String,
    enum: ['blog', 'article'],
    default: 'blog',
    lowercase: true
  },
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true,
    trim: true
  },
  readTime: {
    type: String,
    default: '5 mins',
    trim: true
  },
  isPublished: { 
    type: Boolean, 
    default: true 
  },
  isFeatured: { 
    type: Boolean, 
    default: false 
  },
  isEditorsChoice: { 
    type: Boolean, 
    default: false 
  },
  views: { 
    type: Number, 
    default: 0,
    min: 0
  },
  likes: { 
    type: Number, 
    default: 0,
    min: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for URL
blogSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Virtual for formatted date
blogSchema.virtual('formattedDate').get(function() {
  return this.publishedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for reading time in minutes
blogSchema.virtual('readTimeMinutes').get(function() {
  const timeString = this.readTime.toLowerCase();
  const minutes = timeString.match(/\d+/);
  return minutes ? parseInt(minutes[0]) : 5;
});

// Pre-save middleware to update lastModified
blogSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Pre-update middleware to update lastModified
blogSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ lastModified: new Date() });
  next();
});

// Method to increment views
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to increment likes
blogSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

// Method to get reading time estimate based on content
blogSchema.methods.calculateReadTime = function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min${minutes > 1 ? 's' : ''} read`;
};

// Static method to get published blogs
blogSchema.statics.getPublished = function() {
  return this.find({ isPublished: true }).sort({ publishedAt: -1 });
};

// Static method to get featured blogs
blogSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ isPublished: true, isFeatured: true })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to get blogs by category
blogSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ isPublished: true, category })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to search blogs
blogSchema.statics.search = function(query, limit = 10) {
  return this.find({
    isPublished: true,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { summary: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Static method to get blog stats
blogSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalBlogs: { $sum: 1 },
        publishedBlogs: {
          $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
        },
        draftBlogs: {
          $sum: { $cond: [{ $eq: ['$isPublished', false] }, 1, 0] }
        },
        featuredBlogs: {
          $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
        },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        avgViews: { $avg: '$views' }
      }
    }
  ]);

  return stats[0] || {
    totalBlogs: 0,
    publishedBlogs: 0,
    draftBlogs: 0,
    featuredBlogs: 0,
    totalViews: 0,
    totalLikes: 0,
    avgViews: 0
  };
};

// Add indexes for better performance
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1, isPublished: 1 });
blogSchema.index({ type: 1, isPublished: 1 });
blogSchema.index({ isPublished: 1, publishedAt: -1 });
blogSchema.index({ isPublished: 1, isFeatured: 1 });
blogSchema.index({ isPublished: 1, isEditorsChoice: 1 });
blogSchema.index({ tags: 1, isPublished: 1 });
blogSchema.index({ authorName: 1 });
blogSchema.index({ views: -1 });
blogSchema.index({ likes: -1 });

// Text index for search functionality
blogSchema.index({
  title: 'text',
  summary: 'text',
  content: 'text',
  tags: 'text'
});

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
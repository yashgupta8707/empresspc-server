import mongoose from 'mongoose';

const instagramProductSchema = new mongoose.Schema({
  // User who uploaded
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },

  // Product basic info
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 2000
  },

  // Carousel images - unlimited
  images: [{
    url: String,
    filename: String,
    order: Number
  }],

  // PC Component Specifications (all optional)
  specifications: {
    processor: {
      brand: String,
      model: String,
      cores: Number,
      threads: Number,
      baseClock: String,
      boostClock: String,
      socket: String
    },
    motherboard: {
      brand: String,
      model: String,
      chipset: String,
      formFactor: String,
      socket: String,
      ramSlots: Number,
      maxRam: String
    },
    ram: {
      brand: String,
      model: String,
      capacity: String,
      type: String,
      speed: String,
      modules: String
    },
    storage: {
      brand: String,
      model: String,
      capacity: String,
      type: String, // SSD/NVMe/HDD
      interface: String, // SATA/M.2/PCIe
      readSpeed: String,
      writeSpeed: String
    },
    powerSupply: {
      brand: String,
      model: String,
      wattage: String,
      efficiency: String, // 80+ Bronze/Silver/Gold/Platinum
      modular: String // Full/Semi/Non-modular
    },
    cabinet: {
      brand: String,
      model: String,
      formFactor: String,
      color: String,
      material: String,
      fanSupport: String
    },
    liquidCooler: {
      brand: String,
      model: String,
      type: String, // AIO/Custom
      radiatorSize: String,
      fanSize: String,
      rgb: Boolean
    },
    graphicCard: {
      brand: String,
      model: String,
      chipset: String,
      vram: String,
      coreClock: String,
      boostClock: String,
      tdp: String,
      ports: String
    },
    monitor: {
      brand: String,
      model: String,
      size: String,
      resolution: String,
      refreshRate: String,
      panelType: String, // IPS/VA/TN/OLED
      responseTime: String,
      features: String // G-Sync/FreeSync/HDR
    }
  },

  // Additional metadata
  tags: [String],
  price: {
    type: Number,
    min: 0
  },

  // Engagement metrics
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },

  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  commentsCount: {
    type: Number,
    default: 0
  },

  views: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Moderation
  isFeatured: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
instagramProductSchema.index({ userId: 1, createdAt: -1 });
instagramProductSchema.index({ likesCount: -1 });
instagramProductSchema.index({ createdAt: -1 });
instagramProductSchema.index({ tags: 1 });

// Virtual for image count
instagramProductSchema.virtual('imageCount').get(function() {
  return this.images.length;
});

// Method to add like
instagramProductSchema.methods.addLike = function(userId) {
  const alreadyLiked = this.likes.some(like => like.userId.toString() === userId.toString());
  if (!alreadyLiked) {
    this.likes.push({ userId });
    this.likesCount = this.likes.length;
  }
  return this.save();
};

// Method to remove like
instagramProductSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  this.likesCount = this.likes.length;
  return this.save();
};

// Method to add comment
instagramProductSchema.methods.addComment = function(userId, userName, text) {
  this.comments.push({ userId, userName, text });
  this.commentsCount = this.comments.length;
  return this.save();
};

// Method to increment views
instagramProductSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

const InstagramProduct = mongoose.model('InstagramProduct', instagramProductSchema);

export default InstagramProduct;

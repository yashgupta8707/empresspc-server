// routes/testimonialRoutes.js - Fixed version with proper middleware imports
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Testimonial from '../models/Testimonial.js';

// Import middleware - using the correct middleware files that exist
import { protect, admin } from '../middleware/authMiddleware.js';

// Import Cloudinary functions
import { 
  uploadToCloudinary, 
  deleteFromCloudinary, 
  uploadOptions,
  isCloudinaryConfigured 
} from '../config/cloudinary.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists for fallback
const uploadsDir = path.join(__dirname, '../uploads/testimonials');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `testimonial-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, JPG, PNG, GIF, WebP)!'));
    }
  }
});

// Helper function to handle image upload with Cloudinary fallback
const handleImageUpload = async (filePath, removeLocal = true) => {
  try {
    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(filePath, uploadOptions.testimonials);
      
      // Delete local file after successful upload
      if (removeLocal && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.size
      };
    } else {
      // Fallback to local storage
      const filename = path.basename(filePath);
      console.warn('Cloudinary not configured, using local storage for:', filename);
      
      return {
        url: `/uploads/testimonials/${filename}`,
        publicId: null,
        width: null,
        height: null,
        format: path.extname(filename).substring(1),
        size: fs.statSync(filePath).size
      };
    }
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

// Helper function to delete image from Cloudinary
const handleImageDelete = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured) return;
  
  try {
    await deleteFromCloudinary(publicId);
    console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
  }
};

// ============= PUBLIC ROUTES =============

// Get active testimonials for public display
router.get('/', async (req, res) => {
  try {
    const { 
      limit, 
      featured, 
      page = 1, 
      minRating,
      sort = 'newest'
    } = req.query;
    
    let query = { isActive: true };
    
    // Apply filters
    if (featured === 'true') {
      query.featured = true;
    }
    
    if (minRating && !isNaN(minRating)) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Configure sorting
    let sortOptions = { featured: -1, displayOrder: -1, createdAt: -1 };
    
    switch (sort) {
      case 'oldest':
        sortOptions = { featured: -1, displayOrder: -1, createdAt: 1 };
        break;
      case 'rating-high':
        sortOptions = { rating: -1, featured: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOptions = { rating: 1, featured: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { featured: -1, displayOrder: -1, createdAt: -1 };
        break;
    }

    // Pagination setup
    const pageSize = limit ? parseInt(limit) : 20;
    const skip = (parseInt(page) - 1) * pageSize;

    const testimonials = await Testimonial.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .select('-email -phone -adminNotes -createdBy -updatedBy -cloudinaryPublicId');

    const total = await Testimonial.countDocuments(query);

    res.json({
      success: true,
      data: testimonials.map(t => t.getPublicData ? t.getPublicData() : t),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
        itemsPerPage: pageSize,
        hasNextPage: skip + pageSize < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching testimonials',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get testimonials statistics for public display
router.get('/stats', async (req, res) => {
  try {
    const totalTestimonials = await Testimonial.countDocuments({ isActive: true });
    const verifiedCount = await Testimonial.countDocuments({ isActive: true, verified: true });
    
    const avgRatingResult = await Testimonial.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const ratingDistribution = await Testimonial.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalTestimonials,
        verified: verifiedCount,
        averageRating: avgRatingResult.length > 0 ? parseFloat(avgRatingResult[0].avgRating.toFixed(1)) : 0,
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching testimonial stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching testimonial statistics'
    });
  }
});

// Get featured testimonials
router.get('/featured', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const testimonials = await Testimonial.find({ 
      isActive: true, 
      featured: true 
    })
      .sort({ displayOrder: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .select('-email -phone -adminNotes -createdBy -updatedBy -cloudinaryPublicId');

    res.json({
      success: true,
      data: testimonials.map(t => t.getPublicData ? t.getPublicData() : t)
    });
  } catch (error) {
    console.error('Error fetching featured testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured testimonials'
    });
  }
});

// ============= ADMIN ROUTES =============

// Get all testimonials for admin management
router.get('/admin', protect, admin, async (req, res) => {
  try {
    const { 
      status, 
      rating, 
      verified, 
      featured,
      search,
      page = 1, 
      limit = 20,
      sort = 'newest'
    } = req.query;
    
    let query = {};
    
    // Apply filters
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (rating && rating !== 'all' && !isNaN(rating)) query.rating = parseFloat(rating);
    if (verified === 'verified') query.verified = true;
    if (verified === 'unverified') query.verified = false;
    if (featured === 'featured') query.featured = true;
    if (featured === 'not-featured') query.featured = false;
    
    // Search functionality
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { title: { $regex: search.trim(), $options: 'i' } },
        { content: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
        { productPurchased: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Configure sorting
    let sortOptions = { createdAt: -1 };
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'rating-high':
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOptions = { rating: 1, createdAt: -1 };
        break;
      case 'name':
        sortOptions = { name: 1 };
        break;
      case 'featured':
        sortOptions = { featured: -1, displayOrder: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const testimonials = await Testimonial.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Testimonial.countDocuments(query);

    // Get basic stats
    const totalTestimonials = await Testimonial.countDocuments();
    const activeTestimonials = await Testimonial.countDocuments({ isActive: true });
    const verifiedTestimonials = await Testimonial.countDocuments({ verified: true });
    const featuredTestimonials = await Testimonial.countDocuments({ featured: true });
    
    const avgRatingResult = await Testimonial.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? parseFloat(avgRatingResult[0].avgRating.toFixed(1)) : 0;

    const stats = {
      total: totalTestimonials,
      active: activeTestimonials,
      inactive: totalTestimonials - activeTestimonials,
      verified: verifiedTestimonials,
      unverified: totalTestimonials - verifiedTestimonials,
      featured: featuredTestimonials,
      avgRating
    };

    res.json({
      success: true,
      data: testimonials,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocs: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching admin testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching testimonials for admin'
    });
  }
});

// Create new testimonial
router.post('/admin', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      location,
      title,
      content,
      rating,
      productPurchased,
      purchaseDate,
      verified,
      isActive,
      featured,
      adminNotes,
      displayOrder
    } = req.body;

    // Validate required fields
    if (!name || !location || !title || !content || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, location, title, content, and rating'
      });
    }

    // Validate rating
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5 || ratingNum % 0.5 !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1-5 in increments of 0.5'
      });
    }

    let imageData = {};
    
    // Handle image upload
    if (req.file) {
      try {
        const uploadResult = await handleImageUpload(req.file.path);
        imageData = {
          img: uploadResult.url,
          cloudinaryPublicId: uploadResult.publicId
        };
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Clean up local file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Error uploading image. Please try again.'
        });
      }
    }

    // Create testimonial
    const testimonialData = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      location: location.trim(),
      title: title.trim(),
      content: content.trim(),
      rating: ratingNum,
      productPurchased: productPurchased?.trim() || null,
      purchaseDate: purchaseDate || null,
      verified: verified === 'true' || verified === true,
      isActive: isActive !== 'false' && isActive !== false,
      featured: featured === 'true' || featured === true,
      adminNotes: adminNotes?.trim() || null,
      displayOrder: displayOrder ? parseInt(displayOrder) : undefined,
      createdBy: req.user._id,
      ...imageData
    };

    const testimonial = new Testimonial(testimonialData);
    await testimonial.save();

    // Populate the response
    await testimonial.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Testimonial created successfully',
      data: testimonial
    });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    
    // Clean up uploaded file if testimonial creation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating testimonial'
    });
  }
});

// Update testimonial
router.put('/admin/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    const {
      name,
      email,
      phone,
      location,
      title,
      content,
      rating,
      productPurchased,
      purchaseDate,
      verified,
      isActive,
      featured,
      adminNotes,
      displayOrder,
      removeImage
    } = req.body;

    // Handle rating validation
    if (rating) {
      const ratingNum = parseFloat(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5 || ratingNum % 0.5 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1-5 in increments of 0.5'
        });
      }
    }

    // Handle image update
    let imageData = {};
    
    if (removeImage === 'true' || removeImage === true) {
      // Remove existing image
      if (testimonial.cloudinaryPublicId) {
        await handleImageDelete(testimonial.cloudinaryPublicId);
      }
      imageData = {
        img: null,
        cloudinaryPublicId: null
      };
    } else if (req.file) {
      try {
        // Delete old image if it exists
        if (testimonial.cloudinaryPublicId) {
          await handleImageDelete(testimonial.cloudinaryPublicId);
        }
        
        const uploadResult = await handleImageUpload(req.file.path);
        imageData = {
          img: uploadResult.url,
          cloudinaryPublicId: uploadResult.publicId
        };
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Clean up local file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Error uploading image. Please try again.'
        });
      }
    }

    // Update testimonial data
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(location && { location: location.trim() }),
      ...(title && { title: title.trim() }),
      ...(content && { content: content.trim() }),
      ...(rating && { rating: parseFloat(rating) }),
      ...(productPurchased !== undefined && { productPurchased: productPurchased?.trim() || null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate || null }),
      ...(verified !== undefined && { verified: verified === 'true' || verified === true }),
      ...(isActive !== undefined && { isActive: isActive !== 'false' && isActive !== false }),
      ...(featured !== undefined && { featured: featured === 'true' || featured === true }),
      ...(adminNotes !== undefined && { adminNotes: adminNotes?.trim() || null }),
      ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) || 0 }),
      updatedBy: req.user._id,
      ...imageData
    };

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Testimonial updated successfully',
      data: updatedTestimonial
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    
    // Clean up uploaded file if update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid testimonial ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating testimonial'
    });
  }
});

// Delete testimonial
router.delete('/admin/:id', protect, admin, async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Delete image from Cloudinary if it exists
    if (testimonial.cloudinaryPublicId) {
      await handleImageDelete(testimonial.cloudinaryPublicId);
    }

    await Testimonial.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid testimonial ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting testimonial'
    });
  }
});

export default router;
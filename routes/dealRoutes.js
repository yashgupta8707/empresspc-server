// routes/dealRoutes.js - Deal routes with Cloudinary image upload
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  getCurrentDeal,
  getActiveDeals,
  getDealBySlug,
  trackDealClick,
  getAllDealsAdmin,
  getDealByIdAdmin,
  createDeal,
  updateDeal,
  deleteDeal,
  updateDealStatus,
  getDealAnalytics,
  getDealStats
} from '../controllers/dealController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'deals');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Configure upload fields
const uploadFields = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 5 }
]);

// Error handling middleware for multer
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 6 files allowed (1 main + 5 gallery).'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "mainImage" or "galleryImages".'
      });
    }
  }
  
  if (error.message === 'Only image files (JPEG, PNG, WebP, GIF) are allowed!') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// ============= PUBLIC ROUTES =============

// @route   GET /api/deals/current
// @desc    Get current active deal
// @access  Public
router.get('/current', getCurrentDeal);

// @route   GET /api/deals
// @desc    Get all active deals
// @access  Public
router.get('/', getActiveDeals);

// @route   GET /api/deals/slug/:slug
// @desc    Get deal by slug
// @access  Public
router.get('/slug/:slug', getDealBySlug);

// @route   POST /api/deals/:id/click
// @desc    Track deal click
// @access  Public
router.post('/:id/click', trackDealClick);

// ============= ADMIN ROUTES =============

// @route   GET /api/deals/admin/stats
// @desc    Get deal statistics
// @access  Private/Admin
router.get('/admin/stats', protect, admin, getDealStats);

// @route   GET /api/deals/admin
// @desc    Get all deals for admin
// @access  Private/Admin
router.get('/admin', protect, admin, getAllDealsAdmin);

// @route   POST /api/deals/admin
// @desc    Create new deal
// @access  Private/Admin
router.post('/admin', protect, admin, uploadFields, handleUploadErrors, createDeal);

// @route   GET /api/deals/admin/:id
// @desc    Get deal by ID for admin
// @access  Private/Admin
router.get('/admin/:id', protect, admin, getDealByIdAdmin);

// @route   PUT /api/deals/admin/:id
// @desc    Update deal
// @access  Private/Admin
router.put('/admin/:id', protect, admin, uploadFields, handleUploadErrors, updateDeal);

// @route   DELETE /api/deals/admin/:id
// @desc    Delete deal
// @access  Private/Admin
router.delete('/admin/:id', protect, admin, deleteDeal);

// @route   PATCH /api/deals/admin/:id/status
// @desc    Update deal status
// @access  Private/Admin
router.patch('/admin/:id/status', protect, admin, updateDealStatus);

// @route   GET /api/deals/admin/:id/analytics
// @desc    Get deal analytics
// @access  Private/Admin
router.get('/admin/:id/analytics', protect, admin, getDealAnalytics);

// ============= UTILITY ROUTES =============

// @route   POST /api/deals/admin/upload-image
// @desc    Upload single image for deal
// @access  Private/Admin
router.post('/admin/upload-image', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { uploadToCloudinary, uploadOptions } = await import('../config/cloudinary.js');
    
    const result = await uploadToCloudinary(req.file.path, {
      ...uploadOptions.products,
      folder: 'empress-tech/deals/single'
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
});

// @route   DELETE /api/deals/admin/delete-image/:publicId
// @desc    Delete image from Cloudinary
// @access  Private/Admin
router.delete('/admin/delete-image/:publicId', protect, admin, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    const { deleteFromCloudinary } = await import('../config/cloudinary.js');
    const result = await deleteFromCloudinary(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
});

// @route   POST /api/deals/admin/bulk-status-update
// @desc    Bulk update deal statuses
// @access  Private/Admin
router.post('/admin/bulk-status-update', protect, admin, async (req, res) => {
  try {
    const { dealIds, status } = req.body;

    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Deal IDs array is required'
      });
    }

    if (!['draft', 'active', 'expired', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const Deal = (await import('../models/Deal.js')).default;
    
    const result = await Deal.updateMany(
      { _id: { $in: dealIds } },
      { 
        status,
        lastModifiedBy: req.user._id
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} deals`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating deal statuses',
      error: error.message
    });
  }
});

// @route   POST /api/deals/admin/duplicate/:id
// @desc    Duplicate a deal
// @access  Private/Admin
router.post('/admin/duplicate/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const Deal = (await import('../models/Deal.js')).default;

    const originalDeal = await Deal.findById(id);
    if (!originalDeal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Create new deal object
    const dealData = originalDeal.toObject();
    delete dealData._id;
    delete dealData.createdAt;
    delete dealData.updatedAt;
    delete dealData.__v;

    // Update metadata
    dealData.title = `${dealData.title} (Copy)`;
    dealData.status = 'draft';
    dealData.createdBy = req.user._id;
    dealData.lastModifiedBy = req.user._id;
    dealData.analytics = { views: 0, clicks: 0, conversions: 0 };
    
    // Update slug
    if (dealData.seo && dealData.seo.slug) {
      dealData.seo.slug = `${dealData.seo.slug}-copy-${Date.now()}`;
    }

    // Duplicate images (copy to new Cloudinary paths)
    if (dealData.images) {
      const { uploadToCloudinary, getImageInfo } = await import('../config/cloudinary.js');
      
      // Duplicate main image
      if (dealData.images.main && dealData.images.main.url) {
        try {
          const imageInfo = await getImageInfo(dealData.images.main.publicId);
          const newResult = await uploadToCloudinary(imageInfo.url, {
            folder: 'empress-tech/deals/main',
            public_id: `${dealData.images.main.publicId}-copy-${Date.now()}`
          });
          
          dealData.images.main = {
            url: newResult.url,
            publicId: newResult.publicId,
            alt: dealData.images.main.alt
          };
        } catch (err) {
          console.error('Error duplicating main image:', err);
          // Keep original image reference if duplication fails
        }
      }

      // Duplicate gallery images
      if (dealData.images.gallery && dealData.images.gallery.length > 0) {
        const newGallery = [];
        for (const image of dealData.images.gallery) {
          try {
            const imageInfo = await getImageInfo(image.publicId);
            const newResult = await uploadToCloudinary(imageInfo.url, {
              folder: 'empress-tech/deals/gallery',
              public_id: `${image.publicId}-copy-${Date.now()}`
            });
            
            newGallery.push({
              url: newResult.url,
              publicId: newResult.publicId,
              alt: image.alt
            });
          } catch (err) {
            console.error('Error duplicating gallery image:', err);
            // Skip failed duplications
          }
        }
        dealData.images.gallery = newGallery;
      }
    }

    const newDeal = new Deal(dealData);
    await newDeal.save();

    await newDeal.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Deal duplicated successfully',
      data: { deal: newDeal }
    });
  } catch (error) {
    console.error('Duplicate deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating deal',
      error: error.message
    });
  }
});

export default router;
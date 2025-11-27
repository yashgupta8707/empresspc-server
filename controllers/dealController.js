// controllers/dealController.js - Deal management controller
import Deal from '../models/Deal.js';
import { uploadToCloudinary, deleteFromCloudinary, uploadOptions } from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';

// ============= PUBLIC ENDPOINTS =============

// @desc    Get current active deal
// @route   GET /api/deals/current
// @access  Public
export const getCurrentDeal = async (req, res) => {
  try {
    const deal = await Deal.getCurrentDeal()
      .populate('createdBy', 'name email')
      .populate('relatedProduct', 'name price images');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'No active deal found'
      });
    }

    // Increment views
    await deal.incrementViews();

    res.status(200).json({
      success: true,
      data: {
        deal,
        timeRemaining: deal.timeRemaining,
        status: deal.currentStatus
      }
    });
  } catch (error) {
    console.error('Get current deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current deal',
      error: error.message
    });
  }
};

// @desc    Get all active deals
// @route   GET /api/deals
// @access  Public
export const getActiveDeals = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const deals = await Deal.getActiveDeals()
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('relatedProduct', 'name price images');

    const total = await Deal.countDocuments({
      status: 'active',
      'dealTiming.startDate': { $lte: new Date() },
      'dealTiming.endDate': { $gte: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        deals,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get active deals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deals',
      error: error.message
    });
  }
};

// @desc    Get deal by slug
// @route   GET /api/deals/slug/:slug
// @access  Public
export const getDealBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const deal = await Deal.findOne({ 'seo.slug': slug })
      .populate('createdBy', 'name email')
      .populate('relatedProduct', 'name price images');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Increment views
    await deal.incrementViews();

    res.status(200).json({
      success: true,
      data: {
        deal,
        timeRemaining: deal.timeRemaining,
        status: deal.currentStatus
      }
    });
  } catch (error) {
    console.error('Get deal by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal',
      error: error.message
    });
  }
};

// @desc    Track deal click
// @route   POST /api/deals/:id/click
// @access  Public
export const trackDealClick = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    await deal.incrementClicks();

    res.status(200).json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking click',
      error: error.message
    });
  }
};

// ============= ADMIN ENDPOINTS =============

// @desc    Get all deals for admin
// @route   GET /api/deals/admin
// @access  Private/Admin
export const getAllDealsAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'product.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const deals = await Deal.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('relatedProduct', 'name price');

    const total = await Deal.countDocuments(query);

    // Add computed fields
    const dealsWithStatus = deals.map(deal => ({
      ...deal.toObject(),
      currentStatus: deal.currentStatus,
      timeRemaining: deal.timeRemaining,
      discountPercentage: deal.discountPercentage,
      savingsAmount: deal.savingsAmount
    }));

    res.status(200).json({
      success: true,
      data: {
        deals: dealsWithStatus,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all deals admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deals',
      error: error.message
    });
  }
};

// @desc    Get deal by ID for admin
// @route   GET /api/deals/admin/:id
// @access  Private/Admin
export const getDealByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findById(id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('relatedProduct');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        deal: {
          ...deal.toObject(),
          currentStatus: deal.currentStatus,
          timeRemaining: deal.timeRemaining,
          discountPercentage: deal.discountPercentage,
          savingsAmount: deal.savingsAmount
        }
      }
    });
  } catch (error) {
    console.error('Get deal by ID admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal',
      error: error.message
    });
  }
};

// @desc    Create new deal
// @route   POST /api/deals/admin
// @access  Private/Admin
export const createDeal = async (req, res) => {
  try {
    let dealData = { ...req.body };
    dealData.createdBy = req.user._id;

    console.log('Received form data:', req.body);
    console.log('Received files:', req.files);

    // Parse JSON strings back to objects (only if they are strings)
    if (typeof dealData.product === 'string') {
      try {
        dealData.product = JSON.parse(dealData.product);
      } catch (e) {
        console.error('Error parsing product:', e);
        return res.status(400).json({
          success: false,
          message: 'Invalid product data format'
        });
      }
    }

    if (typeof dealData.pricing === 'string') {
      try {
        dealData.pricing = JSON.parse(dealData.pricing);
      } catch (e) {
        console.error('Error parsing pricing:', e);
        return res.status(400).json({
          success: false,
          message: 'Invalid pricing data format'
        });
      }
    }

    if (typeof dealData.dealTiming === 'string') {
      try {
        dealData.dealTiming = JSON.parse(dealData.dealTiming);
      } catch (e) {
        console.error('Error parsing dealTiming:', e);
        return res.status(400).json({
          success: false,
          message: 'Invalid deal timing data format'
        });
      }
    }

    if (typeof dealData.marketing === 'string') {
      try {
        dealData.marketing = JSON.parse(dealData.marketing);
      } catch (e) {
        console.error('Error parsing marketing:', e);
        return res.status(400).json({
          success: false,
          message: 'Invalid marketing data format'
        });
      }
    }

    if (typeof dealData.seo === 'string') {
      try {
        dealData.seo = JSON.parse(dealData.seo);
      } catch (e) {
        console.error('Error parsing seo:', e);
        // SEO is optional, so continue without it
        dealData.seo = {};
      }
    }

    // Validate required fields
    if (!dealData.title || !dealData.description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    if (!dealData.product || !dealData.product.name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (!dealData.pricing || !dealData.pricing.originalPrice || !dealData.pricing.salePrice) {
      return res.status(400).json({
        success: false,
        message: 'Original price and sale price are required'
      });
    }

    if (!dealData.dealTiming || !dealData.dealTiming.startDate || !dealData.dealTiming.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Deal start and end dates are required'
      });
    }

    // Handle image uploads if files are provided
    if (req.files) {
      const uploadPromises = [];
      
      // Upload main image
      if (req.files.mainImage && req.files.mainImage[0]) {
        const mainImageFile = req.files.mainImage[0];
        const { uploadToCloudinary, uploadOptions } = await import('../config/cloudinary.js');
        
        uploadPromises.push(
          uploadToCloudinary(mainImageFile.path, {
            ...uploadOptions.products,
            folder: 'empress-tech/deals/main'
          }).then(result => {
            dealData.images = {
              main: {
                url: result.secure_url || result.url,
                publicId: result.public_id,
                alt: dealData.title || 'Deal image'
              },
              gallery: dealData.images?.gallery || []
            };
            // Clean up temp file
            try {
              const fs = require('fs');
              fs.unlinkSync(mainImageFile.path);
            } catch (err) {
              console.error('Error cleaning up temp file:', err);
            }
          }).catch(err => {
            console.error('Error uploading main image:', err);
            throw new Error('Failed to upload main image');
          })
        );
      }

      // Upload gallery images
      if (req.files.galleryImages && req.files.galleryImages.length > 0) {
        for (const file of req.files.galleryImages) {
          const { uploadToCloudinary, uploadOptions } = await import('../config/cloudinary.js');
          
          uploadPromises.push(
            uploadToCloudinary(file.path, {
              ...uploadOptions.products,
              folder: 'empress-tech/deals/gallery'
            }).then(result => {
              if (!dealData.images) dealData.images = { main: null, gallery: [] };
              if (!dealData.images.gallery) dealData.images.gallery = [];
              
              dealData.images.gallery.push({
                url: result.secure_url || result.url,
                publicId: result.public_id,
                alt: dealData.title || 'Deal gallery image'
              });
              // Clean up temp file
              try {
                const fs = require('fs');
                fs.unlinkSync(file.path);
              } catch (err) {
                console.error('Error cleaning up temp file:', err);
              }
            }).catch(err => {
              console.error('Error uploading gallery image:', err);
              // Don't throw error for gallery images, just log
            })
          );
        }
      }

      // Wait for all uploads to complete
      try {
        await Promise.all(uploadPromises);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading images: ' + uploadError.message
        });
      }
    }

    // Set default images if none provided
    if (!dealData.images || !dealData.images.main) {
      dealData.images = {
        main: {
          url: '/images/default-product.png', // Use a default image
          publicId: 'default',
          alt: dealData.title || 'Deal image'
        },
        gallery: []
      };
    }

    console.log('Final deal data before save:', JSON.stringify(dealData, null, 2));

    const deal = new Deal(dealData);
    await deal.save();

    await deal.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: { deal }
    });
  } catch (error) {
    console.error('Create deal error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        try {
          const fs = require('fs');
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error('Error cleaning up file:', err);
        }
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error creating deal',
      error: error.message,
      details: error.stack
    });
  }
};

// @desc    Update deal
// @route   PUT /api/deals/admin/:id
// @access  Private/Admin
export const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.lastModifiedBy = req.user._id;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Handle image updates
    if (req.files) {
      const uploadPromises = [];

      // Update main image
      if (req.files.mainImage) {
        const mainImageFile = req.files.mainImage[0];
        
        // Delete old main image from Cloudinary
        if (deal.images.main?.publicId) {
          uploadPromises.push(
            deleteFromCloudinary(deal.images.main.publicId)
          );
        }

        // Upload new main image
        uploadPromises.push(
          uploadToCloudinary(mainImageFile.path, {
            ...uploadOptions.products,
            folder: 'empress-tech/deals/main'
          }).then(result => {
            updateData.images = {
              main: {
                url: result.url,
                publicId: result.publicId,
                alt: updateData.title || deal.title
              },
              gallery: deal.images?.gallery || []
            };
            // Clean up temp file
            fs.unlinkSync(mainImageFile.path);
          })
        );
      }

      // Handle gallery images
      if (req.files.galleryImages && req.files.galleryImages.length > 0) {
        // Optionally delete existing gallery images
        if (updateData.replaceGallery === 'true') {
          for (const image of deal.images.gallery || []) {
            if (image.publicId) {
              uploadPromises.push(deleteFromCloudinary(image.publicId));
            }
          }
          updateData.images = updateData.images || {};
          updateData.images.gallery = [];
        }

        // Upload new gallery images
        for (const file of req.files.galleryImages) {
          uploadPromises.push(
            uploadToCloudinary(file.path, {
              ...uploadOptions.products,
              folder: 'empress-tech/deals/gallery'
            }).then(result => {
              if (!updateData.images) updateData.images = deal.images;
              if (!updateData.images.gallery) updateData.images.gallery = [];
              
              updateData.images.gallery.push({
                url: result.url,
                publicId: result.publicId,
                alt: updateData.title || deal.title
              });
              // Clean up temp file
              fs.unlinkSync(file.path);
            })
          );
        }
      }

      await Promise.all(uploadPromises);
    }

    const updatedDeal = await Deal.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      data: { deal: updatedDeal }
    });
  } catch (error) {
    console.error('Update deal error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error cleaning up file:', err);
        }
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error updating deal',
      error: error.message
    });
  }
};

// @desc    Delete deal
// @route   DELETE /api/deals/admin/:id
// @access  Private/Admin
export const deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Delete images from Cloudinary
    const deletePromises = [];
    
    if (deal.images.main?.publicId) {
      deletePromises.push(deleteFromCloudinary(deal.images.main.publicId));
    }

    for (const image of deal.images.gallery || []) {
      if (image.publicId) {
        deletePromises.push(deleteFromCloudinary(image.publicId));
      }
    }

    await Promise.all(deletePromises);
    await Deal.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting deal',
      error: error.message
    });
  }
};

// @desc    Update deal status
// @route   PATCH /api/deals/admin/:id/status
// @access  Private/Admin
export const updateDealStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'expired', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const deal = await Deal.findByIdAndUpdate(
      id,
      { 
        status,
        lastModifiedBy: req.user._id
      },
      { new: true }
    );

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Deal status updated successfully',
      data: { deal }
    });
  } catch (error) {
    console.error('Update deal status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating deal status',
      error: error.message
    });
  }
};

// @desc    Get deal analytics
// @route   GET /api/deals/admin/:id/analytics
// @access  Private/Admin
export const getDealAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    const analytics = {
      views: deal.analytics.views,
      clicks: deal.analytics.clicks,
      conversions: deal.analytics.conversions,
      ctr: deal.analytics.views > 0 ? (deal.analytics.clicks / deal.analytics.views * 100).toFixed(2) : 0,
      conversionRate: deal.analytics.clicks > 0 ? (deal.analytics.conversions / deal.analytics.clicks * 100).toFixed(2) : 0,
      status: deal.currentStatus,
      timeRemaining: deal.timeRemaining
    };

    res.status(200).json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Get deal analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// @desc    Get deal statistics overview
// @route   GET /api/deals/admin/stats
// @access  Private/Admin
export const getDealStats = async (req, res) => {
  try {
    const now = new Date();
    
    const stats = await Deal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalClicks: { $sum: '$analytics.clicks' },
          totalConversions: { $sum: '$analytics.conversions' }
        }
      }
    ]);

    const activeDealsCount = await Deal.countDocuments({
      status: 'active',
      'dealTiming.startDate': { $lte: now },
      'dealTiming.endDate': { $gte: now }
    });

    const expiredDealsCount = await Deal.countDocuments({
      'dealTiming.endDate': { $lt: now }
    });

    const upcomingDealsCount = await Deal.countDocuments({
      'dealTiming.startDate': { $gt: now }
    });

    const totalRevenue = await Deal.aggregate([
      {
        $match: {
          'analytics.conversions': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $multiply: ['$pricing.salePrice', '$analytics.conversions']
            }
          }
        }
      }
    ]);

    const formattedStats = {
      total: stats.reduce((acc, stat) => acc + stat.count, 0),
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          views: stat.totalViews,
          clicks: stat.totalClicks,
          conversions: stat.totalConversions
        };
        return acc;
      }, {}),
      active: activeDealsCount,
      expired: expiredDealsCount,
      upcoming: upcomingDealsCount,
      totalViews: stats.reduce((acc, stat) => acc + stat.totalViews, 0),
      totalClicks: stats.reduce((acc, stat) => acc + stat.totalClicks, 0),
      totalConversions: stats.reduce((acc, stat) => acc + stat.totalConversions, 0),
      totalRevenue: totalRevenue[0]?.totalRevenue || 0
    };

    res.status(200).json({
      success: true,
      data: { stats: formattedStats }
    });
  } catch (error) {
    console.error('Get deal stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal statistics',
      error: error.message
    });
  }
};
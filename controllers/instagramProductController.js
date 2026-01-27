import InstagramProduct from '../models/InstagramProduct.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create new Instagram product post
// @route   POST /api/instagram-products
// @access  Private
export const createInstagramProduct = async (req, res) => {
  try {
    const { title, description, specifications, tags, price } = req.body;

    // Get user info from auth middleware
    const userId = req.user._id;
    const userName = req.user.name || req.user.email;

    // Handle uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        images.push({
          url: `/uploads/images/${file.filename}`,
          filename: file.filename,
          order: index
        });
      });
    }

    const instagramProduct = await InstagramProduct.create({
      userId,
      userName,
      title,
      description,
      images,
      specifications: specifications ? JSON.parse(specifications) : {},
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      price: price || 0
    });

    res.status(201).json({
      success: true,
      message: 'Product post created successfully',
      data: instagramProduct
    });
  } catch (error) {
    console.error('Error creating Instagram product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product post',
      error: error.message
    });
  }
};

// @desc    Get all Instagram products (feed)
// @route   GET /api/instagram-products
// @access  Public
export const getInstagramProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    // Filter by user
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    // Filter by tags
    if (req.query.tags) {
      filter.tags = { $in: req.query.tags.split(',') };
    }

    // Sort options
    let sort = {};
    switch (req.query.sort) {
      case 'popular':
        sort = { likesCount: -1, views: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      default:
        sort = { createdAt: -1 }; // newest first
    }

    const products = await InstagramProduct.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await InstagramProduct.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching Instagram products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// @desc    Get single Instagram product
// @route   GET /api/instagram-products/:id
// @access  Public
export const getInstagramProduct = async (req, res) => {
  try {
    const product = await InstagramProduct.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('comments.userId', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views
    await product.incrementViews();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching Instagram product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// @desc    Update Instagram product
// @route   PUT /api/instagram-products/:id
// @access  Private (Owner only)
export const updateInstagramProduct = async (req, res) => {
  try {
    const product = await InstagramProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    const { title, description, specifications, tags, price } = req.body;

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/images/${file.filename}`,
        filename: file.filename,
        order: product.images.length + index
      }));
      product.images.push(...newImages);
    }

    // Update fields
    if (title) product.title = title;
    if (description) product.description = description;
    if (specifications) product.specifications = JSON.parse(specifications);
    if (tags) product.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (price !== undefined) product.price = price;

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating Instagram product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// @desc    Delete Instagram product
// @route   DELETE /api/instagram-products/:id
// @access  Private (Owner or Admin)
export const deleteInstagramProduct = async (req, res) => {
  try {
    const product = await InstagramProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Delete associated images from disk
    product.images.forEach(image => {
      try {
        const imagePath = path.join(__dirname, '..', '..', image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting image file:', err);
      }
    });

    await InstagramProduct.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Instagram product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// @desc    Like/Unlike Instagram product
// @route   POST /api/instagram-products/:id/like
// @access  Private
export const toggleLike = async (req, res) => {
  try {
    const product = await InstagramProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const userId = req.user._id;
    const alreadyLiked = product.likes.some(like => like.userId.toString() === userId.toString());

    if (alreadyLiked) {
      await product.removeLike(userId);
      res.json({
        success: true,
        message: 'Like removed',
        liked: false,
        likesCount: product.likesCount
      });
    } else {
      await product.addLike(userId);
      res.json({
        success: true,
        message: 'Product liked',
        liked: true,
        likesCount: product.likesCount
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// @desc    Add comment to Instagram product
// @route   POST /api/instagram-products/:id/comment
// @access  Private
export const addComment = async (req, res) => {
  try {
    const product = await InstagramProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const userId = req.user._id;
    const userName = req.user.name || req.user.email;

    await product.addComment(userId, userName, text);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: product.comments[product.comments.length - 1]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

// @desc    Delete image from product
// @route   DELETE /api/instagram-products/:id/image/:filename
// @access  Private (Owner only)
export const deleteImage = async (req, res) => {
  try {
    const product = await InstagramProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this product'
      });
    }

    const { filename } = req.params;

    // Remove image from array
    product.images = product.images.filter(img => img.filename !== filename);

    // Delete file from disk
    try {
      const imagePath = path.join(__dirname, '..', '..', 'uploads', 'images', filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (err) {
      console.error('Error deleting image file:', err);
    }

    await product.save();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

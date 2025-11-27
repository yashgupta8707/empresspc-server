// routes/categoryRoutes.js
import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// @desc Get all categories with product counts
// @route GET /api/categories
// @access Public
router.get('/', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc Get category details with featured products
// @route GET /api/categories/:categoryId
// @access Public
router.get('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Get category stats
    const categoryStats = await Product.aggregate([
      { $match: { category: categoryId } },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          brands: { $addToSet: '$brand' }
        }
      }
    ]);

    if (categoryStats.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get featured products (top 6 by price)
    const featuredProducts = await Product.find({ category: categoryId })
      .sort({ price: -1 })
      .limit(6);

    res.json({
      category: categoryStats[0],
      featuredProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
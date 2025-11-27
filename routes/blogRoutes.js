// routes/blogRoutes.js
import express from 'express';
import {
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  getBlogsByCategory,
  getFeaturedBlogs,
  getEditorsChoiceBlogs,
  getRecentBlogs,
  getPopularBlogs,
  getAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
  getBlogStats
} from '../controllers/blogController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========
router.get('/', getAllBlogs);
router.get('/featured', getFeaturedBlogs);
router.get('/editors-choice', getEditorsChoiceBlogs);
router.get('/recent', getRecentBlogs);
router.get('/popular', getPopularBlogs);
router.get('/category/:category', getBlogsByCategory);
router.get('/slug/:slug', getBlogBySlug);
router.get('/:id', getBlogById);

// ========== ADMIN ROUTES ==========
router.get('/admin/all', protect, admin, getAllBlogsAdmin);
router.post('/admin/create', protect, admin, createBlog);
router.put('/admin/:id', protect, admin, updateBlog);
router.delete('/admin/:id', protect, admin, deleteBlog);
router.put('/admin/:id/toggle-status', protect, admin, toggleBlogStatus);
router.get('/admin/stats', protect, admin, getBlogStats);

export default router;
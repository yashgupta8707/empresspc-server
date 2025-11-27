// routes/blogRoutes.js
import express from 'express';
import {
  getAllBlogs,
  getBlogBySlug,
  getFeaturedBlogs,
  getEditorsChoiceBlogs,
  getRecentBlogs,
  getPopularBlogs,
  getBlogsByCategory,
  getAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogById,
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

// ========== ADMIN ROUTES ==========
router.get('/admin/all', protect, admin, getAllBlogsAdmin);
router.post('/admin/create', protect, admin, createBlog);
router.get('/admin/stats', protect, admin, getBlogStats);
router.get('/admin/:id', protect, admin, getBlogById);
router.put('/admin/:id', protect, admin, updateBlog);
router.delete('/admin/:id', protect, admin, deleteBlog);
router.patch('/admin/:id/toggle-status', protect, admin, toggleBlogStatus);

export default router;
// routes/aboutRoutes.js
import express from 'express';
import {
  getAboutPageData,
  getAllGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getAllTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAllStats,
  createStat,
  updateStat,
  deleteStat,
  getAllCoreValues,
  createCoreValue,
  updateCoreValue,
  deleteCoreValue,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getCompanyInfo,
  updateCompanyInfo
} from '../controllers/aboutController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - Get all about page data
router.get('/', getAboutPageData);

// Admin routes - Gallery Items
router.get('/admin/gallery', protect, admin, getAllGalleryItems);
router.post('/admin/gallery', protect, admin, createGalleryItem);
router.put('/admin/gallery/:id', protect, admin, updateGalleryItem);
router.delete('/admin/gallery/:id', protect, admin, deleteGalleryItem);

// Admin routes - Team Members
router.get('/admin/team', protect, admin, getAllTeamMembers);
router.post('/admin/team', protect, admin, createTeamMember);
router.put('/admin/team/:id', protect, admin, updateTeamMember);
router.delete('/admin/team/:id', protect, admin, deleteTeamMember);

// Admin routes - Stats
router.get('/admin/stats', protect, admin, getAllStats);
router.post('/admin/stats', protect, admin, createStat);
router.put('/admin/stats/:id', protect, admin, updateStat);
router.delete('/admin/stats/:id', protect, admin, deleteStat);

// Admin routes - Core Values
router.get('/admin/core-values', protect, admin, getAllCoreValues);
router.post('/admin/core-values', protect, admin, createCoreValue);
router.put('/admin/core-values/:id', protect, admin, updateCoreValue);
router.delete('/admin/core-values/:id', protect, admin, deleteCoreValue);

// Admin routes - Testimonials
router.get('/admin/testimonials', protect, admin, getAllTestimonials);
router.post('/admin/testimonials', protect, admin, createTestimonial);
router.put('/admin/testimonials/:id', protect, admin, updateTestimonial);
router.delete('/admin/testimonials/:id', protect, admin, deleteTestimonial);

// Admin routes - Company Info
router.get('/admin/company-info', protect, admin, getCompanyInfo);
router.put('/admin/company-info', protect, admin, updateCompanyInfo);

export default router;
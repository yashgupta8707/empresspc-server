// routes/contactRoutes.js - Fixed version
import express from 'express';
import { 
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactStats
} from '../controllers/contactController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - Submit contact form
router.post('/', submitContactForm);

// Admin routes - Manage contact inquiries
// FIXED: Remove '/admin' prefix since we're already in /api/contact
router.get('/admin/all', protect, admin, getAllContacts);
router.get('/admin/stats', protect, admin, getContactStats);
router.get('/admin/:id', protect, admin, getContactById);
router.put('/admin/:id', protect, admin, updateContact);
router.delete('/admin/:id', protect, admin, deleteContact);

export default router;
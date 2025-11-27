// routes/eventRoutes.js
import express from 'express';
import {
  getAllEvents,
  getUpcomingEvents,
  getEventSchedule,
  getFeaturedEvents,
  getEventById,
  getAllEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats
} from '../controllers/eventController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========
router.get('/', getAllEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/schedule', getEventSchedule);
router.get('/featured', getFeaturedEvents);
router.get('/public/:id', getEventById);

// ========== ADMIN ROUTES ==========
router.get('/admin/all', protect, admin, getAllEventsAdmin);
router.post('/admin/create', protect, admin, createEvent);
router.get('/admin/stats', protect, admin, getEventStats);
router.get('/admin/:id', protect, admin, getEventById);
router.put('/admin/:id', protect, admin, updateEvent);
router.delete('/admin/:id', protect, admin, deleteEvent);

export default router;
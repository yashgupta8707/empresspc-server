// routes/winnerRoutes.js
import express from 'express';
import {
  getAllWinners,
  getFeaturedWinners,
  getRecentWinners,
  getAllWinnersAdmin,
  createWinner,
  updateWinner,
  deleteWinner,
  getWinnerStats
} from '../controllers/winnerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========
router.get('/', getAllWinners);
router.get('/featured', getFeaturedWinners);
router.get('/recent', getRecentWinners);

// ========== ADMIN ROUTES ==========
router.get('/admin/all', protect, admin, getAllWinnersAdmin);
router.post('/admin/create', protect, admin, createWinner);
router.get('/admin/stats', protect, admin, getWinnerStats);
router.put('/admin/:id', protect, admin, updateWinner);
router.delete('/admin/:id', protect, admin, deleteWinner);

export default router;
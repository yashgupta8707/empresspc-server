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
router.get('/recent', getRecentWinners);

// ========== ADMIN ROUTES ==========

export default router;
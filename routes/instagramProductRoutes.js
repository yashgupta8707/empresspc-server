import express from 'express';
import {
  createInstagramProduct,
  getInstagramProducts,
  getInstagramProduct,
  updateInstagramProduct,
  deleteInstagramProduct,
  toggleLike,
  addComment,
  deleteImage
} from '../controllers/instagramProductController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getInstagramProducts);
router.get('/:id', getInstagramProduct);

// Protected routes (requires authentication)
router.post('/', protect, upload.array('images', 20), createInstagramProduct);
router.put('/:id', protect, upload.array('images', 20), updateInstagramProduct);
router.delete('/:id', protect, deleteInstagramProduct);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.delete('/:id/image/:filename', protect, deleteImage);

export default router;

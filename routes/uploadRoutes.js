// routes/uploadRoutes.js
import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { uploadImage, uploadFile, deleteFile } from '../controllers/uploadController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Upload single image
router.post('/image', protect, admin, upload.single('image'), uploadImage);

// Upload single file
router.post('/file', protect, admin, upload.single('file'), uploadFile);

// Delete file
router.delete('/file/:filename', protect, admin, deleteFile);

export default router;
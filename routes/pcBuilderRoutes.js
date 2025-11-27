// routes/pcBuilderRoutes.js
import express from 'express';
import {
  getComponentsByPlatform,
  getCompatibleComponents,
  createConfiguration,
  addComponentToConfiguration,
  removeComponentFromConfiguration,
  getConfiguration,
  getUserConfigurations,
  checkConfigurationCompatibility,
  getPlatformFilters,
  getRecommendedConfigurations,
  saveAsTemplate
} from '../controllers/pcBuilderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/components/:platform', getComponentsByPlatform);
router.get('/compatible/:componentId/:targetCategory', getCompatibleComponents);
router.get('/filters/:platform', getPlatformFilters);
router.get('/recommendations/:platform', getRecommendedConfigurations);

// Configuration routes
router.post('/configuration', createConfiguration);
router.get('/configuration/:configId', getConfiguration);
router.put('/configuration/:configId/component', addComponentToConfiguration);
router.delete('/configuration/:configId/component', removeComponentFromConfiguration);
router.get('/configuration/:configId/compatibility', checkConfigurationCompatibility);
router.get('/configurations', getUserConfigurations);

// Admin routes
router.put('/configuration/:configId/template', protect, admin, saveAsTemplate);

export default router;
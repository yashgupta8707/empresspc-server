// controllers/pcBuilderController.js
import Product from '../models/Product.js';
import PCConfiguration from '../models/PCConfiguration.js';
import asyncHandler from 'express-async-handler';

// Compatibility rules for Intel and AMD platforms
const COMPATIBILITY_RULES = {
  intel: {
    sockets: {
      'LGA1700': {
        supportedChipsets: ['Z790', 'Z690', 'B760', 'B660', 'H770', 'H670'],
        supportedProcessors: ['12th Gen', '13th Gen'],
        supportedMemory: ['DDR4', 'DDR5']
      },
      'LGA1200': {
        supportedChipsets: ['Z590', 'Z490', 'B560', 'B460', 'H570', 'H470'],
        supportedProcessors: ['10th Gen', '11th Gen'],
        supportedMemory: ['DDR4']
      }
    }
  },
  amd: {
    sockets: {
      'AM5': {
        supportedChipsets: ['X670E', 'X670', 'B650E', 'B650', 'A620'],
        supportedProcessors: ['7000 Series', '8000 Series'],
        supportedMemory: ['DDR5']
      },
      'AM4': {
        supportedChipsets: ['X570', 'X470', 'B550', 'B450', 'A520'],
        supportedProcessors: ['3000 Series', '5000 Series'],
        supportedMemory: ['DDR4']
      }
    }
  }
};

// @desc    Get components by platform
// @route   GET /api/pc-builder/components/:platform
// @access  Public
export const getComponentsByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { category, priceMin, priceMax, brand, socket, chipset } = req.query;

  if (!['intel', 'amd'].includes(platform)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid platform. Must be intel or amd' 
    });
  }

  // Build query
  let query = {
    isActive: true,
    $or: [
      { 'pcBuilderSpecs.platform': platform },
      { 'pcBuilderSpecs.platform': 'universal' }
    ]
  };

  if (category) {
    query.category = category;
  }

  if (priceMin || priceMax) {
    query.price = {};
    if (priceMin) query.price.$gte = parseInt(priceMin);
    if (priceMax) query.price.$lte = parseInt(priceMax);
  }

  if (brand) {
    query.brand = new RegExp(brand, 'i');
  }

  if (socket) {
    query.$or = [
      { 'pcBuilderSpecs.processorSpecs.socket': socket },
      { 'pcBuilderSpecs.motherboardSpecs.socket': socket }
    ];
  }

  if (chipset) {
    query['pcBuilderSpecs.motherboardSpecs.chipset'] = chipset;
  }

  try {
    const components = await Product.find(query)
      .sort({ price: 1 })
      .limit(50);

    res.json({
      success: true,
      count: components.length,
      data: components
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching components',
      error: error.message
    });
  }
});

// @desc    Get compatible components for a specific component
// @route   GET /api/pc-builder/compatible/:componentId/:targetCategory
// @access  Public
export const getCompatibleComponents = asyncHandler(async (req, res) => {
  const { componentId, targetCategory } = req.params;

  try {
    const referenceComponent = await Product.findById(componentId);
    
    if (!referenceComponent) {
      return res.status(404).json({
        success: false,
        message: 'Reference component not found'
      });
    }

    let compatibleComponents = [];

    // Processor to Motherboard compatibility
    if (referenceComponent.category === 'processors' && targetCategory === 'motherboards') {
      const socket = referenceComponent.pcBuilderSpecs?.processorSpecs?.socket;
      if (socket) {
        compatibleComponents = await Product.find({
          category: 'motherboards',
          'pcBuilderSpecs.motherboardSpecs.socket': socket,
          isActive: true
        }).limit(30);
      }
    }

    // Motherboard to Processor compatibility
    if (referenceComponent.category === 'motherboards' && targetCategory === 'processors') {
      const socket = referenceComponent.pcBuilderSpecs?.motherboardSpecs?.socket;
      if (socket) {
        compatibleComponents = await Product.find({
          category: 'processors',
          'pcBuilderSpecs.processorSpecs.socket': socket,
          isActive: true
        }).limit(30);
      }
    }

    // Motherboard to Memory compatibility
    if (referenceComponent.category === 'motherboards' && targetCategory === 'memory') {
      const supportedMemory = referenceComponent.pcBuilderSpecs?.motherboardSpecs?.supportedMemoryTypes;
      if (supportedMemory && supportedMemory.length > 0) {
        compatibleComponents = await Product.find({
          category: 'memory',
          'pcBuilderSpecs.memorySpecs.type': { $in: supportedMemory },
          isActive: true
        }).limit(30);
      }
    }

    // For other categories, return all active components
    if (compatibleComponents.length === 0) {
      compatibleComponents = await Product.find({
        category: targetCategory,
        isActive: true
      }).limit(30);
    }

    res.json({
      success: true,
      referenceComponent: referenceComponent.name,
      targetCategory,
      count: compatibleComponents.length,
      data: compatibleComponents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching compatible components',
      error: error.message
    });
  }
});

// @desc    Create new PC configuration
// @route   POST /api/pc-builder/configuration
// @access  Public
export const createConfiguration = asyncHandler(async (req, res) => {
  const { configName, platform, useCase, budget, sessionId } = req.body;

  try {
    const configuration = await PCConfiguration.create({
      configName: configName || `${platform.toUpperCase()} Build`,
      platform,
      useCase: useCase || 'General',
      budget,
      userId: req.user?.id || null,
      sessionId: sessionId || req.sessionID
    });

    res.status(201).json({
      success: true,
      message: 'PC configuration created successfully',
      data: configuration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating configuration',
      error: error.message
    });
  }
});

// @desc    Add component to configuration
// @route   PUT /api/pc-builder/configuration/:configId/component
// @access  Public
export const addComponentToConfiguration = asyncHandler(async (req, res) => {
  const { configId } = req.params;
  const { componentType, productId, quantity = 1 } = req.body;

  try {
    const configuration = await PCConfiguration.findById(configId);
    const product = await Product.findById(productId);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check platform compatibility
    const productPlatform = product.pcBuilderSpecs?.platform;
    if (productPlatform && productPlatform !== 'universal' && productPlatform !== configuration.platform) {
      return res.status(400).json({
        success: false,
        message: `Product is not compatible with ${configuration.platform.toUpperCase()} platform`
      });
    }

    // Add component to configuration
    configuration.addComponent(componentType, product, quantity);
    await configuration.save();

    res.json({
      success: true,
      message: 'Component added to configuration',
      data: configuration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding component to configuration',
      error: error.message
    });
  }
});

// @desc    Remove component from configuration
// @route   DELETE /api/pc-builder/configuration/:configId/component
// @access  Public
export const removeComponentFromConfiguration = asyncHandler(async (req, res) => {
  const { configId } = req.params;
  const { componentType, storageIndex } = req.body;

  try {
    const configuration = await PCConfiguration.findById(configId);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    configuration.removeComponent(componentType, storageIndex);
    await configuration.save();

    res.json({
      success: true,
      message: 'Component removed from configuration',
      data: configuration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing component from configuration',
      error: error.message
    });
  }
});

// @desc    Get configuration by ID
// @route   GET /api/pc-builder/configuration/:configId
// @access  Public
export const getConfiguration = asyncHandler(async (req, res) => {
  const { configId } = req.params;

  try {
    const configuration = await PCConfiguration.findById(configId);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching configuration',
      error: error.message
    });
  }
});

// @desc    Get user configurations
// @route   GET /api/pc-builder/configurations
// @access  Public
export const getUserConfigurations = asyncHandler(async (req, res) => {
  const { sessionId } = req.query;
  
  try {
    let configurations;

    if (req.user) {
      configurations = await PCConfiguration.findByUser(req.user.id);
    } else if (sessionId) {
      configurations = await PCConfiguration.findBySession(sessionId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID or Session ID required'
      });
    }

    res.json({
      success: true,
      count: configurations.length,
      data: configurations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching configurations',
      error: error.message
    });
  }
});

// @desc    Check configuration compatibility
// @route   GET /api/pc-builder/configuration/:configId/compatibility
// @access  Public
export const checkConfigurationCompatibility = asyncHandler(async (req, res) => {
  const { configId } = req.params;

  try {
    const configuration = await PCConfiguration.findById(configId)
      .populate('components.processor.productId')
      .populate('components.motherboard.productId')
      .populate('components.memory.productId')
      .populate('components.graphicsCard.productId')
      .populate('components.powerSupply.productId');

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const compatibility = await checkDetailedCompatibility(configuration);

    res.json({
      success: true,
      data: {
        configurationId: configId,
        compatibility
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking compatibility',
      error: error.message
    });
  }
});

// @desc    Get platform-specific filters
// @route   GET /api/pc-builder/filters/:platform
// @access  Public
export const getPlatformFilters = asyncHandler(async (req, res) => {
  const { platform } = req.params;

  if (!['intel', 'amd'].includes(platform)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid platform' 
    });
  }

  try {
    const filters = {
      sockets: [],
      chipsets: [],
      brands: [],
      priceRanges: [
        { label: 'Under ₹10,000', min: 0, max: 10000 },
        { label: '₹10,000 - ₹25,000', min: 10000, max: 25000 },
        { label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
        { label: '₹50,000 - ₹1,00,000', min: 50000, max: 100000 },
        { label: 'Above ₹1,00,000', min: 100000, max: null }
      ]
    };

    // Get available sockets for the platform
    const socketAggregation = await Product.aggregate([
      { 
        $match: { 
          isActive: true, 
          category: { $in: ['processors', 'motherboards'] },
          $or: [
            { 'pcBuilderSpecs.platform': platform },
            { 'pcBuilderSpecs.platform': 'universal' }
          ]
        } 
      },
      {
        $group: {
          _id: null,
          processorSockets: { $addToSet: '$pcBuilderSpecs.processorSpecs.socket' },
          motherboardSockets: { $addToSet: '$pcBuilderSpecs.motherboardSpecs.socket' }
        }
      }
    ]);

    if (socketAggregation.length > 0) {
      const allSockets = [
        ...(socketAggregation[0].processorSockets || []),
        ...(socketAggregation[0].motherboardSockets || [])
      ];
      filters.sockets = [...new Set(allSockets)].filter(Boolean);
    }

    // Get available chipsets
    const chipsetAggregation = await Product.aggregate([
      { 
        $match: { 
          isActive: true, 
          category: 'motherboards',
          $or: [
            { 'pcBuilderSpecs.platform': platform },
            { 'pcBuilderSpecs.platform': 'universal' }
          ]
        } 
      },
      {
        $group: {
          _id: '$pcBuilderSpecs.motherboardSpecs.chipset',
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    filters.chipsets = chipsetAggregation.map(item => item._id);

    // Get available brands
    const brandAggregation = await Product.aggregate([
      { 
        $match: { 
          isActive: true,
          $or: [
            { 'pcBuilderSpecs.platform': platform },
            { 'pcBuilderSpecs.platform': 'universal' }
          ]
        } 
      },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } }
    ]);

    filters.brands = brandAggregation.map(item => item._id);

    res.json({
      success: true,
      platform,
      data: filters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching platform filters',
      error: error.message
    });
  }
});

// Helper function for detailed compatibility checking
async function checkDetailedCompatibility(configuration) {
  const issues = [];
  const warnings = [];
  const suggestions = [];

  const { processor, motherboard, memory, graphicsCard, powerSupply } = configuration.components;

  // Socket compatibility check
  if (processor.productId && motherboard.productId) {
    const procSocket = processor.productId.pcBuilderSpecs?.processorSpecs?.socket;
    const mbSocket = motherboard.productId.pcBuilderSpecs?.motherboardSpecs?.socket;

    if (procSocket && mbSocket && procSocket !== mbSocket) {
      issues.push({
        severity: 'error',
        component1: 'processor',
        component2: 'motherboard',
        message: `Socket mismatch: Processor requires ${procSocket} but motherboard has ${mbSocket}`,
        code: 'SOCKET_MISMATCH',
        autoFix: 'Select a compatible motherboard or processor'
      });
    }
  }

  // Memory compatibility check
  if (motherboard.productId && memory.productId) {
    const mbMemoryTypes = motherboard.productId.pcBuilderSpecs?.motherboardSpecs?.supportedMemoryTypes || [];
    const memoryType = memory.productId.pcBuilderSpecs?.memorySpecs?.type;

    if (memoryType && mbMemoryTypes.length > 0 && !mbMemoryTypes.includes(memoryType)) {
      issues.push({
        severity: 'error',
        component1: 'motherboard',
        component2: 'memory',
        message: `Memory type ${memoryType} is not supported by motherboard`,
        code: 'MEMORY_TYPE_MISMATCH',
        autoFix: 'Select compatible memory type'
      });
    }
  }

  // Power supply wattage check
  if (powerSupply.productId && (processor.productId || graphicsCard.productId)) {
    const psuWattage = powerSupply.productId.pcBuilderSpecs?.psuSpecs?.wattage || 0;
    let totalPowerDraw = 0;

    if (processor.productId) {
      totalPowerDraw += processor.productId.pcBuilderSpecs?.processorSpecs?.tdp || 0;
    }
    if (graphicsCard.productId) {
      totalPowerDraw += graphicsCard.productId.pcBuilderSpecs?.graphicsSpecs?.tdp || 0;
    }

    totalPowerDraw += 100; // Add base system power draw

    if (psuWattage < totalPowerDraw * 1.2) { // 20% headroom
      if (psuWattage < totalPowerDraw) {
        issues.push({
          severity: 'error',
          component1: 'powerSupply',
          component2: 'system',
          message: `Power supply ${psuWattage}W is insufficient for system requiring ${totalPowerDraw}W`,
          code: 'INSUFFICIENT_POWER',
          autoFix: `Select a power supply with at least ${Math.ceil(totalPowerDraw * 1.2)}W capacity`
        });
      } else {
        warnings.push({
          type: 'power',
          message: `Power supply ${psuWattage}W has minimal headroom. Consider ${Math.ceil(totalPowerDraw * 1.3)}W+ for better efficiency`,
          component: 'powerSupply'
        });
      }
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    warnings,
    suggestions,
    lastChecked: new Date()
  };
}

// @desc    Get recommended configurations
// @route   GET /api/pc-builder/recommendations/:platform
// @access  Public
export const getRecommendedConfigurations = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { budget, useCase } = req.query;

  if (!['intel', 'amd'].includes(platform)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid platform' 
    });
  }

  try {
    let query = { 
      platform, 
      status: 'completed',
      isPublic: true
    };

    if (useCase) {
      query.useCase = useCase;
    }

    if (budget) {
      const budgetNum = parseInt(budget);
      query['pricing.total'] = {
        $gte: budgetNum * 0.8,
        $lte: budgetNum * 1.2
      };
    }

    const recommendations = await PCConfiguration.find(query)
      .sort({ 'pricing.total': 1 })
      .limit(10);

    res.json({
      success: true,
      platform,
      useCase: useCase || 'all',
      budget: budget || 'any',
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
});

// @desc    Save configuration as template
// @route   PUT /api/pc-builder/configuration/:configId/template
// @access  Private (Admin)
export const saveAsTemplate = asyncHandler(async (req, res) => {
  const { configId } = req.params;
  const { isPublic = true } = req.body;

  try {
    const configuration = await PCConfiguration.findByIdAndUpdate(
      configId,
      { 
        status: 'completed',
        isPublic,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Configuration saved as template',
      data: configuration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving template',
      error: error.message
    });
  }
});
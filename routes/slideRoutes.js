// routes/slideRoutes.js - Database-connected Carousel/Slides API Routes
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { protect, admin } from "../middleware/authMiddleware.js";
import Slide from "../models/Slide.js";

const router = express.Router();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/slides");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "slide-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ========== PUBLIC ROUTES ==========

// @desc    Get all active slides for public display
// @route   GET /api/slides
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { active } = req.query;
    let query = {};

    if (active === "true") {
      query.isActive = true;
    }

    const slides = await Slide.find(query).sort({ order: 1 });
    res.json(slides);
  } catch (error) {
    console.error("Error fetching slides:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slides",
      error: error.message,
    });
  }
});

// @desc    Get single slide by ID
// @route   GET /api/slides/:id
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    // Increment view count
    await slide.incrementViews();

    res.json(slide);
  } catch (error) {
    console.error("Error fetching slide:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slide",
      error: error.message,
    });
  }
});

// @desc    Track slide click
// @route   POST /api/slides/:id/click
// @access  Public
router.post("/:id/click", async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    // Increment click count
    await slide.incrementClicks();

    res.json({
      success: true,
      message: "Click tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking click:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track click",
      error: error.message,
    });
  }
});

// ========== ADMIN ROUTES ==========

// @desc    Get all slides for admin management
// @route   GET /api/slides/admin
// @access  Private/Admin
router.get("/admin", protect, admin, async (req, res) => {
  try {
    const { active, page = 1, limit = 10, category } = req.query;
    let query = {};

    if (active === "true") {
      query.isActive = true;
    } else if (active === "false") {
      query.isActive = false;
    }

    if (category) {
      query.category = category;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { order: 1 },
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
      ]
    };

    const slides = await Slide.paginate(query, options);

    res.json({
      success: true,
      slides: slides.docs,
      totalSlides: slides.totalDocs,
      currentPage: slides.page,
      totalPages: slides.totalPages,
      hasNext: slides.hasNextPage,
      hasPrev: slides.hasPrevPage,
    });
  } catch (error) {
    console.error("Error fetching slides for admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slides",
      error: error.message,
    });
  }
});

// @desc    Get single slide for admin
// @route   GET /api/slides/admin/:id
// @access  Private/Admin
router.get("/admin/:id", protect, admin, async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }
    res.json(slide);
  } catch (error) {
    console.error("Error fetching slide:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slide",
      error: error.message,
    });
  }
});

// @desc    Create new slide
// @route   POST /api/slides/admin
// @access  Private/Admin
router.post("/admin", protect, admin, upload.single("image"), async (req, res) => {
  try {
    const { 
      id, 
      title, 
      description, 
      isActive = true, 
      order,
      buttonText,
      buttonLink,
      category,
      altText
    } = req.body;

    // Validation
    if (!id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: id, title, description",
      });
    }

    // Check if slide ID already exists
    const existingSlide = await Slide.findOne({ id });
    if (existingSlide) {
      return res.status(400).json({
        success: false,
        message: "Slide ID already exists",
      });
    }

    // Handle image
    let imageUrl = req.body.imageUrl || "";
    if (req.file) {
      imageUrl = `/uploads/slides/${req.file.filename}`;
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // Get next order if not provided
    const slideOrder = order ? parseInt(order) : await Slide.getNextOrder();

    const newSlide = new Slide({
      id,
      title,
      description,
      image: imageUrl,
      isActive: isActive === "true" || isActive === true,
      order: slideOrder,
      buttonText,
      buttonLink,
      category,
      altText,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const savedSlide = await newSlide.save();
    await savedSlide.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Slide created successfully",
      slide: savedSlide,
    });
  } catch (error) {
    console.error("Error creating slide:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create slide",
      error: error.message,
    });
  }
});

// @desc    Update slide
// @route   PUT /api/slides/admin/:id
// @access  Private/Admin
router.put("/admin/:id", protect, admin, upload.single("image"), async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    const { 
      id, 
      title, 
      description, 
      isActive, 
      order,
      buttonText,
      buttonLink,
      category,
      altText
    } = req.body;

    // Check if new slide ID conflicts with existing ones (excluding current slide)
    if (id && id !== slide.id) {
      const existingSlide = await Slide.findOne({ id, _id: { $ne: req.params.id } });
      if (existingSlide) {
        return res.status(400).json({
          success: false,
          message: "Slide ID already exists",
        });
      }
    }

    // Handle image update
    let imageUrl = slide.image;
    if (req.file) {
      // Delete old image file if it exists and is a local upload
      if (slide.image && slide.image.startsWith("/uploads/slides/")) {
        const oldImagePath = path.join(__dirname, "..", slide.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imageUrl = `/uploads/slides/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    // Update slide fields
    if (id) slide.id = id;
    if (title) slide.title = title;
    if (description) slide.description = description;
    slide.image = imageUrl;
    if (typeof isActive !== "undefined") {
      slide.isActive = isActive === "true" || isActive === true;
    }
    if (order) slide.order = parseInt(order);
    if (buttonText) slide.buttonText = buttonText;
    if (buttonLink) slide.buttonLink = buttonLink;
    if (category) slide.category = category;
    if (altText) slide.altText = altText;
    slide.updatedBy = req.user._id;

    const updatedSlide = await slide.save();
    await updatedSlide.populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: "Slide updated successfully",
      slide: updatedSlide,
    });
  } catch (error) {
    console.error("Error updating slide:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update slide",
      error: error.message,
    });
  }
});

// @desc    Delete slide
// @route   DELETE /api/slides/admin/:id
// @access  Private/Admin
router.delete("/admin/:id", protect, admin, async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    // Delete associated image file if it exists
    if (slide.image && slide.image.startsWith("/uploads/slides/")) {
      const imagePath = path.join(__dirname, "..", slide.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await slide.deleteOne();
    res.json({
      success: true,
      message: "Slide deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting slide:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete slide",
      error: error.message,
    });
  }
});

// @desc    Upload slide image
// @route   POST /api/slides/upload-image
// @access  Private/Admin
router.post("/upload-image", protect, admin, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    const imageUrl = `/uploads/slides/${req.file.filename}`;
    res.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: error.message,
    });
  }
});

// @desc    Toggle slide status
// @route   PATCH /api/slides/admin/:id/toggle-status
// @access  Private/Admin
router.patch("/admin/:id/toggle-status", protect, admin, async (req, res) => {
  try {
    const { field } = req.body;
    const slide = await Slide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    if (!["isActive"].includes(field)) {
      return res.status(400).json({
        success: false,
        message: "Invalid field. Allowed: isActive",
      });
    }

    slide[field] = !slide[field];
    slide.updatedBy = req.user._id;
    await slide.save();

    res.json({
      success: true,
      message: `Slide ${field} toggled successfully`,
      slide,
    });
  } catch (error) {
    console.error("Error toggling slide status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle slide status",
      error: error.message,
    });
  }
});

// @desc    Reorder slides
// @route   POST /api/slides/admin/reorder
// @access  Private/Admin
router.post("/admin/reorder", protect, admin, async (req, res) => {
  try {
    const { slideIds } = req.body;

    if (!Array.isArray(slideIds)) {
      return res.status(400).json({
        success: false,
        message: "slideIds must be an array",
      });
    }

    // Update order based on array position using bulk operations
    const bulkOps = slideIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { 
          order: index + 1,
          updatedBy: req.user._id
        }
      }
    }));

    await Slide.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: "Slide order updated successfully",
    });
  } catch (error) {
    console.error("Error reordering slides:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update slide order",
      error: error.message,
    });
  }
});

// @desc    Bulk update slides
// @route   POST /api/slides/admin/bulk-update
// @access  Private/Admin
router.post("/admin/bulk-update", protect, admin, async (req, res) => {
  try {
    const { slideIds, updates } = req.body;

    if (!Array.isArray(slideIds) || slideIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide slideIds array",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Please provide updates object",
      });
    }

    const result = await Slide.updateMany(
      { _id: { $in: slideIds } },
      { 
        ...updates,
        updatedBy: req.user._id
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} slides updated successfully`,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk updating slides:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update slides",
      error: error.message,
    });
  }
});

// @desc    Get slide statistics
// @route   GET /api/slides/admin/stats
// @access  Private/Admin
router.get("/admin/stats", protect, admin, async (req, res) => {
  try {
    const totalSlides = await Slide.countDocuments();
    const activeSlides = await Slide.countDocuments({ isActive: true });
    const inactiveSlides = totalSlides - activeSlides;
    const totalViews = await Slide.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalClicks = await Slide.aggregate([
      { $group: { _id: null, total: { $sum: '$clicks' } } }
    ]);

    const stats = {
      totalSlides,
      activeSlides,
      inactiveSlides,
      totalViews: totalViews[0]?.total || 0,
      totalClicks: totalClicks[0]?.total || 0,
      clickThroughRate: totalViews[0]?.total > 0 
        ? ((totalClicks[0]?.total || 0) / totalViews[0].total * 100).toFixed(2)
        : 0,
      lastUpdated: await Slide.findOne().sort({ updatedAt: -1 }).select('updatedAt'),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting slide stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get slide statistics",
      error: error.message,
    });
  }
});

export default router;
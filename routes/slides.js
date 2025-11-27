// backend/routes/slides.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/images/slides';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'slide-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Mock database - replace with your actual database (MongoDB, PostgreSQL, etc.)
let slides = [
  {
    _id: '1',
    id: 'productivity',
    title: 'Enhance Your Productivity',
    description: 'Multitask, manage, and move faster with PCs designed for workflows, responsiveness, and seamless business workflows.',
    image: '/images/img1.JPG',
    isActive: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '2',
    id: 'gaming',
    title: 'Enhance Your Gaming Experience',
    description: 'Dominate every game with high-performance PCs built for immersive graphics, fast response times, and smooth gameplay.',
    image: '/images/img2.JPG',
    isActive: true,
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '3',
    id: 'server',
    title: 'Enhance Your Servers',
    description: 'Power your infrastructure with robust servers built for reliability, scalability, and high-performance data management and processing.',
    image: '/images/img3.JPG',
    isActive: true,
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let nextId = 4;

// GET /api/slides - Get all slides
router.get('/', (req, res) => {
  try {
    const { active } = req.query;
    let filteredSlides = slides;
    
    if (active === 'true') {
      filteredSlides = slides.filter(slide => slide.isActive);
    }
    
    filteredSlides.sort((a, b) => a.order - b.order);
    res.json(filteredSlides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
});

// GET /api/slides/:id - Get single slide
router.get('/:id', (req, res) => {
  try {
    const slide = slides.find(s => s._id === req.params.id);
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    res.json(slide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slide' });
  }
});

// POST /api/slides - Create new slide
router.post('/', (req, res) => {
  try {
    const { id, title, description, image, isActive = true, order } = req.body;
    
    // Validation
    if (!id || !title || !description || !image) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if slide ID already exists
    if (slides.find(s => s.id === id)) {
      return res.status(400).json({ error: 'Slide ID already exists' });
    }
    
    const newSlide = {
      _id: String(nextId++),
      id,
      title,
      description,
      image,
      isActive,
      order: order || slides.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    slides.push(newSlide);
    res.status(201).json(newSlide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

// PUT /api/slides/:id - Update slide
router.put('/:id', (req, res) => {
  try {
    const slideIndex = slides.findIndex(s => s._id === req.params.id);
    if (slideIndex === -1) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    const { id, title, description, image, isActive, order } = req.body;
    
    // Check if new slide ID conflicts with existing ones (excluding current slide)
    if (id && slides.find(s => s.id === id && s._id !== req.params.id)) {
      return res.status(400).json({ error: 'Slide ID already exists' });
    }
    
    const updatedSlide = {
      ...slides[slideIndex],
      ...(id && { id }),
      ...(title && { title }),
      ...(description && { description }),
      ...(image && { image }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(order && { order }),
      updatedAt: new Date()
    };
    
    slides[slideIndex] = updatedSlide;
    res.json(updatedSlide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

// DELETE /api/slides/:id - Delete slide
router.delete('/:id', (req, res) => {
  try {
    const slideIndex = slides.findIndex(s => s._id === req.params.id);
    if (slideIndex === -1) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    const deletedSlide = slides[slideIndex];
    
    // Delete associated image file if it exists
    if (deletedSlide.image && deletedSlide.image.startsWith('/images/slides/')) {
      const imagePath = path.join(__dirname, '../../public', deletedSlide.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    slides.splice(slideIndex, 1);
    res.json({ message: 'Slide deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slide' });
  }
});

// POST /api/upload - Upload image
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    const imageUrl = `/images/slides/${req.file.filename}`;
    res.json({ 
      imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// PATCH /api/slides/reorder - Bulk update slide orders
router.patch('/reorder', (req, res) => {
  try {
    const { slideOrders } = req.body; // Array of {id, order}
    
    if (!Array.isArray(slideOrders)) {
      return res.status(400).json({ error: 'slideOrders must be an array' });
    }
    
    slideOrders.forEach(({ id, order }) => {
      const slideIndex = slides.findIndex(s => s._id === id);
      if (slideIndex !== -1) {
        slides[slideIndex].order = order;
        slides[slideIndex].updatedAt = new Date();
      }
    });
    
    slides.sort((a, b) => a.order - b.order);
    res.json({ message: 'Slide order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slide order' });
  }
});

module.exports = router;

// backend/server.js - Main server file
const express = require('express');
const cors = require('cors');
const path = require('path');
const slidesRouter = require('./routes/slides');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Routes
app.use('/api/slides', slidesRouter);
app.use('/api/upload', slidesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// backend/package.json - Dependencies
/*
{
  "name": "carousel-backend",
  "version": "1.0.0",
  "description": "Backend API for carousel component",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/
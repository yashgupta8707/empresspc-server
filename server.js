// server.js - Final version with complete routes including carousel
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { fileURLToPath } from "url";
import path from "path";

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Initialize Express app
const app = express();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
  origin: ["http://localhost:5174", "http://localhost:3000", "http://192.168.1.56:5174" ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Basic middleware setup
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static file serving
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API info route
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Empress Tech API",
    version: "1.0.0",
    status: "Server running properly",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      products: "/api/products",
      orders: "/api/orders",
      payment: "/api/payment",
      blogs: "/api/blogs",
      events: "/api/events",
      contact: "/api/contact",
      slides: "/api/slides",
      admin: "/api/admin",
    },
  });
});

console.log("Loading routes...");

try {
  // Load routes in order of importance
  console.log("Loading auth routes...");
  const authRoutes = await import("./routes/authRoutes.js");
  app.use("/api/auth", authRoutes.default);
  console.log("✅ Auth routes loaded");

  console.log("Loading payment routes...");
  const paymentRoutes = await import("./routes/paymentRoutes.js");
  app.use("/api/payment", paymentRoutes.default);
  console.log("✅ Payment routes loaded");

  console.log("Loading product routes...");
  const productRoutes = await import("./routes/productRoutes.js");
  app.use("/api/products", productRoutes.default);
  console.log("✅ Product routes loaded");

  console.log("Loading user routes...");
  const userRoutes = await import("./routes/userRoutes.js");
  app.use("/api/users", userRoutes.default);
  console.log("✅ User routes loaded");

  console.log("Loading order routes...");
  const orderRoutes = await import("./routes/orderRoutes.js");
  app.use("/api/orders", orderRoutes.default);
  console.log("✅ Order routes loaded");

  // Essential routes
  console.log("Loading category routes...");
  const categoryRoutes = await import("./routes/categoryRoutes.js");
  app.use("/api/categories", categoryRoutes.default);
  console.log("✅ Category routes loaded");

  console.log("Loading upload routes...");
  const uploadRoutes = await import("./routes/uploadRoutes.js");
  app.use("/api/upload", uploadRoutes.default);
  console.log("✅ Upload routes loaded");

  // CAROUSEL/SLIDES ROUTES - NEW ADDITION
  console.log("Loading carousel/slides routes...");
  const slideRoutes = await import("./routes/slideRoutes.js");
  app.use("/api/slides", slideRoutes.default);    
  console.log("✅ Carousel/Slides routes loaded");

  console.log("Loading PCBuilder routes...");
  const pcBuildRoutes = await import("./routes/pcBuilderRoutes.js");
  app.use("/api/pc-builder", pcBuildRoutes.default);
  console.log("✅ PC Builder routes loaded");

  // BLOG ROUTES - CRITICAL FIX
  console.log("Loading blog routes...");
  const blogRoutes = await import("./routes/blogRoutes.js");
  app.use("/api/blogs", blogRoutes.default);
  console.log("✅ Blog routes loaded");

  // EVENT ROUTES - FIX FOR EVENTS
  console.log("Loading event routes...");
  const eventRoutes = await import("./routes/eventRoutes.js");
  app.use("/api/events", eventRoutes.default);
  console.log("✅ Event routes loaded");

  // CONTACT ROUTES - FIX FOR CONTACTS
  console.log("Loading contact routes...");
  const contactRoutes = await import("./routes/contactRoutes.js");
  app.use("/api/contact", contactRoutes.default);
  console.log("✅ Contact routes loaded");

  // Admin routes (should come after individual routes)
  console.log("Loading admin routes...");
  const adminRoutes = await import("./routes/adminRoutes.js");
  app.use("/api/admin", adminRoutes.default);
  console.log("✅ Admin routes loaded");

  //Deal routes
  console.log("Loading deal routes...");
  const dealRoutes = await import("./routes/dealRoutes.js");
  app.use("/api/deals", dealRoutes.default);
  console.log("✅ Deal routes loaded");

  // Cart routes
  // Import cart routes
  console.log("Loading cart routes...");
  const cartRoutes = await import("./routes/cartRoutes.js");
  // Use cart routes
  app.use("/api/cart", cartRoutes.default);
  console.log("✅ Cart routes loaded");

  // Optional routes with error handling
  try {
    console.log("Loading about routes...");
    const aboutRoutes = await import("./routes/aboutRoutes.js");
    app.use("/api/about", aboutRoutes.default);
    console.log("✅ About routes loaded");
  } catch (err) {
    console.log("⚠️ About routes skipped:", err.message);
  }

  try {
    console.log("Loading winner routes...");
    const winnerRoutes = await import("./routes/winnerRoutes.js");
    app.use("/api/winners", winnerRoutes.default);
    console.log("✅ Winner routes loaded");
  } catch (err) {
    console.log("⚠️ Winner routes skipped:", err.message);
  }

  // Optional testimonial routes with error handling
  try {
    console.log("Loading testimonial routes...");
    const testimonialRoutes = await import("./routes/testimonialRoutes.js");
    app.use("/api/testimonials", testimonialRoutes.default);
    console.log("✅ Testimonial routes loaded");
  } catch (err) {
    console.log("⚠️ Testimonial routes skipped:", err.message);
  }

  console.log("✅ All routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading routes:", error);
  process.exit(1);
}

console.log("🔧 Setting up safe error handlers...");

// File upload error handler (no route patterns)
app.use((error, req, res, next) => {
  // Handle multer errors
  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 5MB.",
    });
  }

  if (error && error.message === "Only image files are allowed!") {
    return res.status(400).json({
      success: false,
      message: "Only image files are allowed!",
    });
  }

  next(error);
});

// Safe 404 handler - NO WILDCARDS
app.use((req, res, next) => {
  // Only handle API requests
  if (req.path.startsWith("/api/")) {
    res.status(404).json({
      success: false,
      message: "API endpoint not found",
      path: req.path,
      method: req.method,
      availableEndpoints: [
        "/api/health",
        "/api/auth",
        "/api/products",
        "/api/orders",
        "/api/payment",
        "/api/blogs",
        "/api/events",
        "/api/contact",
        "/api/slides",
        "/api/admin",
      ],
    });
  } else {
    next();
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global Error:", error.message);

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(error.status || 500).json({
    success: false,
    message: isDevelopment ? error.message : "Internal server error",
    ...(isDevelopment && { stack: error.stack }),
  });
});

console.log("✅ Error handlers set up successfully");

// Start server
const PORT = process.env.PORT || 5000;

try {
  const server = app.listen(PORT, () => {
    console.log(`
🚀 Empress Tech Server Started Successfully!
🏷 Environment: ${process.env.NODE_ENV || "development"}
🌐 Port: ${PORT}
📊 Database: Connected
💳 Payment: ${
      process.env.RAZORPAY_KEY_ID ? "Razorpay Configured" : "Not configured"
    }
🛡️ Error Handling: Safe (no wildcards)
📝 Blog Routes: ✅ Loaded
📅 Event Routes: ✅ Loaded  
📞 Contact Routes: ✅ Loaded
🎠 Carousel Routes: ✅ Loaded

Health Check: http://localhost:${PORT}/api/health
API Info: http://localhost:${PORT}/api
Blog API: http://localhost:${PORT}/api/blogs
Event API: http://localhost:${PORT}/api/events
Contact API: http://localhost:${PORT}/api/contact
Slides API: http://localhost:${PORT}/api/slides
    `);
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down gracefully...");
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 SIGTERM received, shutting down gracefully...");
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  });
} catch (error) {
  console.error("❌ Error starting server:", error);
  process.exit(1);
}

export default app;
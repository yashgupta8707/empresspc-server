// minimal-server.js - Isolate the path-to-regexp issue
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

console.log("Testing basic Express setup...");

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic CORS (simplified)
app.use(cors({
  origin: true,
  credentials: true
}));

console.log("Basic middleware loaded...");

// Simple routes
app.get("/", (req, res) => {
  res.json({ message: "Server running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

console.log("Basic routes added...");

// Test problematic middleware one by one

// 1. Test static files
try {
  console.log("Testing static files...");
  app.use("/uploads", express.static("./uploads"));
  console.log("✅ Static files OK");
} catch (error) {
  console.error("❌ Static files error:", error.message);
}

// 2. Test 404 handler
try {
  console.log("Testing 404 handler...");
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: "API endpoint not found"
    });
  });
  console.log("✅ 404 handler OK");
} catch (error) {
  console.error("❌ 404 handler error:", error.message);
}

// 3. Test error handler
try {
  console.log("Testing error handler...");
  app.use((error, req, res, next) => {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  });
  console.log("✅ Error handler OK");
} catch (error) {
  console.error("❌ Error handler error:", error.message);
}

console.log("All middleware tests passed. Starting server...");

// Start server
const PORT = 5000;
try {
  const server = app.listen(PORT, () => {
    console.log(`✅ Minimal server running on port ${PORT}`);
    console.log(`Test: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
} catch (error) {
  console.error("❌ Server start error:", error);
}
/**
 * Spectra Guard — Express Server
 * Main entry point for the Node.js backend.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const uploadRoutes = require("./routes/upload");
const analyticsRoutes = require("./routes/analytics");
const authRoutes = require("./routes/auth");
const logsRoutes = require("./routes/logs");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/spectraguard";

// Ensure directories exist (Skip on Vercel, as FS is read-only)
const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_REGION;
if (!isVercel) {
  const dirs = ["uploads", "processed"];
  dirs.forEach((dir) => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving for processed results
app.use("/processed", express.static(path.join(__dirname, "processed")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "operational",
    service: "spectraguard-api",
    timestamp: new Date().toISOString(),
  });
});

// 1. Database Connection (Global)
if (!MONGO_URI) {
  console.error("[SPECTRA GUARD] FATAL: MONGO_URI is not defined in .env");
} else {
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, 
      connectTimeoutMS: 10000,
    })
    .then(() => console.log("[SPECTRA GUARD] MongoDB connected successfully"))
    .catch((err) => console.error("[SPECTRA GUARD] MongoDB connection error:", err.message));
}

// Server start (Only if NOT running as a serverless function)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`[SPECTRA GUARD] API Server running on port ${PORT}`);
  });
}

module.exports = app;

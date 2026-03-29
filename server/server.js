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

// Ensure directories exist
const dirs = ["uploads", "processed"];
dirs.forEach((dir) => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

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

// MongoDB connection and server start
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[SPECTRA GUARD] MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`[SPECTRA GUARD] API Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[SPECTRA GUARD] MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;

/**
 * Spectra Guard — Upload Routes (Cloudinary Powered)
 * Handles image/video file uploads, forwards to ML service,
 * saves to Cloudinary, and returns detection results.
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const DetectionLog = require("../models/DetectionLog");
const requireAuth = require("../middleware/requireAuth");
const { uploadToCloudinary } = require("../utils/cloudinary");

const router = express.Router();

// Require auth for uploads
router.use(requireAuth);

/**
 * Multer Configuration (Memory Storage for Vercel)
 * Files are kept in RAM until uploaded to Cloudinary/ML Service.
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedImage = /jpeg|jpg|png|bmp|webp/;
    const allowedVideo = /mp4|avi|mov|mkv|webm/;
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (allowedImage.test(ext) || allowedVideo.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },
});

/**
 * POST /api/upload/image
 * Process image through ML → Upload annotated result to Cloudinary → Log to DB
 */
router.post("/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1. Forward to ML Service
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "image/jpeg"
    });

    const ML_BASE = process.env.ML_SERVICE_URL || "https://akshatabhat23-forest-intrusion.hf.space";
    const ML_URL = `${ML_BASE}/analyze-frame`;

    console.log(`[ML PROXY] Requesting analysis from: ${ML_URL}`);
    const mlResponse = await axios.post(ML_URL, form, {
      headers: { ...form.getHeaders(), "ngrok-skip-browser-warning": "true" },
      timeout: 60000,
    });

    const mlData = mlResponse.data;
    let detections = parseDetections(mlData);

    // 2. Handle Result Image (Annotated or Original)
    let finalImageBuffer = req.file.buffer;
    if (mlData.image) {
      const base64Data = mlData.image.replace(/^data:image\/\w+;base64,/, "");
      finalImageBuffer = Buffer.from(base64Data, "base64");
    }

    // 3. Upload to Cloudinary
    console.log(`[CLOUDINARY] Uploading processed image...`);
    const cloudRes = await uploadToCloudinary(finalImageBuffer, "image", req.file.originalname);

    // 4. Save to MongoDB
    const logEntries = detections.map((det) => ({
      timestamp: new Date(),
      source: "image",
      object_class: det.object_class,
      confidence: det.confidence,
      status: det.status,
      uploadedBy: req.user._id,
      imageUrl: cloudRes.url,
      cloudinary_id: cloudRes.public_id
    }));

    if (logEntries.length > 0) await DetectionLog.insertMany(logEntries);

    res.json({
      success: true,
      annotated_url: cloudRes.url,
      detections: logEntries,
      total_detections: logEntries.length,
    });

  } catch (error) {
    handleError(res, error, "Image processing failed");
  }
});

/**
 * POST /api/upload/video
 * Process video → Upload to Cloudinary → Log to DB
 */
router.post("/video", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1. Forward to ML (Video analysis)
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "video/mp4"
    });

    const ML_BASE = process.env.ML_SERVICE_URL || "https://akshatabhat23-forest-intrusion.hf.space";
    const ML_VIDEO_URL = `${ML_BASE}/analyze-video`;

    const mlResponse = await axios.post(ML_VIDEO_URL, form, {
      headers: { ...form.getHeaders(), "ngrok-skip-browser-warning": "true" },
      timeout: 300000,
    });

    const mlData = mlResponse.data;
    const results = mlData.detections || mlData.results || [];

    // 2. Upload Video to Cloudinary
    console.log(`[CLOUDINARY] Uploading video file...`);
    const cloudRes = await uploadToCloudinary(req.file.buffer, "video", req.file.originalname);

    // 3. Log unique detections
    const { assignedTo } = req.body;
    const assignedOfficers = parseAssignedOfficers(assignedTo);
    const uniqueDetections = extractUniqueVideoDetections(results, mlData, req.user._id, cloudRes, assignedOfficers);

    if (uniqueDetections.length > 0) await DetectionLog.insertMany(uniqueDetections);

    res.json({
      success: true,
      annotated_url: cloudRes.url,
      detections: uniqueDetections,
      total_detections: uniqueDetections.length,
    });

  } catch (error) {
    handleError(res, error, "Video processing failed");
  }
});

/**
 * POST /api/upload/frame
 * Proxy webcam frame to ML → Save Log
 */
router.post("/frame", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const form = new FormData();
    form.append("file", req.file.buffer, { filename: "frame.jpg", contentType: "image/jpeg" });

    const ML_BASE = process.env.ML_SERVICE_URL || "https://akshatabhat23-forest-intrusion.hf.space";
    const mlResponse = await axios.post(`${ML_BASE}/analyze-frame`, form, {
      headers: { ...form.getHeaders() },
      timeout: 15000,
    });

    const mlData = mlResponse.data;
    const cloudRes = await uploadToCloudinary(req.file.buffer, "image", "webcam-frame.jpg");

    const { assignedTo } = req.body;
    const assignedOfficers = parseAssignedOfficers(assignedTo);
    
    const logs = (mlData.detections || mlData.summary || []).map(item => ({
      timestamp: new Date(),
      source: "webcam",
      object_class: item.object || item.class || "unknown",
      confidence: item.confidence || 0,
      status: item.status ? item.status.toUpperCase() : (mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN"),
      uploadedBy: req.user._id,
      imageUrl: cloudRes.url,
      cloudinary_id: cloudRes.public_id,
      assignedTo: assignedOfficers
    }));

    if (logs.length > 0) await DetectionLog.insertMany(logs);

    res.json({ success: true, detections: logs });
  } catch (error) {
    handleError(res, error, "Frame proxy failed");
  }
});

// --- HELPER FUNCTIONS ---

function parseDetections(mlData) {
  const raw = mlData.detections || mlData.summary || [];
  let detections = Array.isArray(raw) ? raw.map(item => {
    if (typeof item === 'string') return { object_class: item, confidence: 1.0, status: mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN" };
    return {
      object_class: item.object || item.class || "unknown",
      confidence: item.confidence || 1.0,
      status: item.status ? item.status.toUpperCase() : (mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN")
    };
  }) : [];

  if (mlData.intrusion_detected && detections.length === 0) {
    detections.push({ object_class: "Intrusion Activity", confidence: 1.0, status: "INTRUSION" });
  }
  return detections;
}

function parseAssignedOfficers(assignedTo) {
  if (!assignedTo) return [];
  try {
    const parsed = JSON.parse(assignedTo);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [assignedTo];
  }
}

function extractUniqueVideoDetections(results, mlData, userId, cloudRes, assignedTo) {
  const unique = [];
  const seen = new Set();
  for (const frame of results) {
    for (const item of (frame.summary || [])) {
      const obj = item.object || item.class || "unknown";
      const stat = item.status ? item.status.toUpperCase() : (mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN");
      const key = `${obj}-${stat}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          timestamp: new Date(),
          source: "video",
          object_class: obj,
          confidence: item.confidence || 0,
          status: stat,
          uploadedBy: userId,
          imageUrl: cloudRes.url,
          cloudinary_id: cloudRes.public_id,
          assignedTo
        });
      }
    }
  }
  return unique;
}

function handleError(res, error, baseMessage) {
  let details = error.response?.data || error.message;
  let msg = baseMessage;
  if (typeof details === "string" && details.includes("<!DOCTYPE html>")) {
    msg = "ML SERVICE OFFLINE: The AI engine is currently down.";
    details = "ERR_ML_SERVICE_OFFLINE";
  }
  console.error(`[UPLOAD ERROR] ${baseMessage}:`, details);
  res.status(502).json({ error: msg, details });
}

module.exports = router;

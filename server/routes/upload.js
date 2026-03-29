/**
 * Spectra Guard — Upload Routes
 * Handles image/video file uploads, forwards to Python ML service,
 * saves detection results to MongoDB, and returns annotated output.
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const DetectionLog = require("../models/DetectionLog");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Require auth for uploads
router.use(requireAuth);

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowedImage = /jpeg|jpg|png|bmp|webp/;
    const allowedVideo = /mp4|avi|mov|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowedImage.test(ext) || allowedVideo.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },
});

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/upload/image
 * Upload an image → forward to HF ML service → save detections → return results
 */
router.post("/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "image/jpeg"
    });

    const ML_BASE = process.env.ML_SERVICE_URL || "https://virtuous-jerrie-unsterile.ngrok-free.dev";
    const NGROK_URL = `${ML_BASE}/analyze-frame`;

    const headers = {
      ...form.getHeaders(),
      "ngrok-skip-browser-warning": "true"
    };

    console.log(`[ML PROXY] Initiating request to: ${NGROK_URL}`);

    const mlResponse = await axios.post(NGROK_URL, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000, 
    });

    console.log(`[ML PROXY] Response status: ${mlResponse.status}`);

    const mlData = mlResponse.data;

    // Parse detections from the summary array or default
    let detections = [];
    if (mlData.summary && Array.isArray(mlData.summary)) {
      detections = mlData.summary.map(item => {
        if (typeof item === 'string') {
          return {
            object_class: item,
            confidence: 1.0,
            status: mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN"
          };
        }
        return {
          object_class: item.object || item.class || item.object_class || "unknown",
          confidence: item.confidence || 1.0,
          status: item.status ? item.status.toUpperCase() : (mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN")
        };
      });
    }

    // Force an intrusion log if the flag is true but summary was empty
    if (mlData.intrusion_detected && detections.length === 0) {
      detections.push({
        object_class: "Intrusion Activity",
        confidence: 1.0,
        status: "INTRUSION"
      });
    }

    // Save annotated base64 image locally
    const processedDir = path.join(__dirname, "..", "processed");
    if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

    const annotated_file = `annotated-${Date.now()}.jpg`;
    const localAnnotatedPath = path.join(processedDir, annotated_file);

    if (mlData.image) {
      // Remove data URL prefix if present (e.g., data:image/jpeg;base64,)
      const base64Data = mlData.image.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(localAnnotatedPath, Buffer.from(base64Data, "base64"));
    } else {
      // Fallback: just copy original if no annotated image returned
      fs.copyFileSync(req.file.path, localAnnotatedPath);
    }

    // Save detections to MongoDB
    const logEntries = detections.map((det) => ({
      timestamp: new Date(),
      source: "image",
      object_class: det.object_class,
      confidence: det.confidence,
      status: det.status,
      uploadedBy: req.user._id,
      imageUrl: `/processed/${annotated_file}`
    }));

    if (logEntries.length > 0) {
      await DetectionLog.insertMany(logEntries);
    }

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      annotated_url: `/processed/${annotated_file}`,
      detections: logEntries,
      total_detections: logEntries.length,
    });
  } catch (error) {
    let details = error.response?.data || error.message;
    let errorMessage = "Failed to process image via ngrok service";
    
    // Check if ngrok returned an HTML error page (Tunnel offline or expired)
    if (typeof details === "string" && details.includes("<!DOCTYPE html>")) {
      errorMessage = "ML SERVICE OFFLINE: The ngrok tunnel is down. Please restart your ML service and ngrok.";
      details = "ERR_NGROK_OFFLINE";
    }

    console.error("Image processing error:", details);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(502).json({
      error: errorMessage,
      details: details,
    });
  }
});

/**
 * POST /api/upload/video
 * Upload a video → forward to Python ML service → save detections → return results
 */
router.post("/video", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "video/mp4"
    });

    const ML_BASE = process.env.ML_SERVICE_URL || "https://virtuous-jerrie-unsterile.ngrok-free.dev";
    const NGROK_VIDEO_URL = `${ML_BASE}/analyze-video`;

    const headers = {
      ...form.getHeaders(),
      "ngrok-skip-browser-warning": "true"
    };

    const mlResponse = await axios.post(NGROK_VIDEO_URL, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000, // 5 min timeout for video
    });

    const mlData = mlResponse.data;
    const results = mlData.results || [];

    const processedDir = path.join(__dirname, "..", "processed");
    if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

    const processedName = `video-${Date.now()}${path.extname(req.file.originalname)}`;
    const localProcessedPath = path.join(processedDir, processedName);
    fs.copyFileSync(req.file.path, localProcessedPath);

    fs.unlinkSync(req.file.path);

    // Deduplicate detections for DB (aggregate per class)
    const uniqueDetections = [];
    const seen = new Set();

    for (const frameResult of results) {
      for (const item of (frameResult.summary || [])) {
        const object_class = item.object || item.class || item.object_class || "unknown";
        const status = item.status ? item.status.toUpperCase() : (mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN");
        const confidence = item.confidence || 0;

        const key = `${object_class}-${status}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueDetections.push({
            timestamp: new Date(),
            source: "video",
            object_class,
            confidence,
            status,
            uploadedBy: req.user._id,
            imageUrl: `/processed/${processedName}`
          });
        }
      }
    }

    if (uniqueDetections.length > 0) {
      await DetectionLog.insertMany(uniqueDetections);
    }

    res.json({
      success: true,
      annotated_url: `/processed/${processedName}`,
      detections: uniqueDetections,
      total_detections: uniqueDetections.length,
      frames_processed: mlData.frames_analyzed || 0,
    });
  } catch (error) {
    let details = error.response?.data || error.message;
    let errorMessage = "Failed to process video";
    
    if (typeof details === "string" && details.includes("<!DOCTYPE html>")) {
      errorMessage = "ML SERVICE OFFLINE: The ngrok tunnel is down. Please restart your ML service and ngrok.";
      details = "ERR_NGROK_OFFLINE";
    }

    console.error("Video processing error:", details);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(502).json({
      error: errorMessage,
      details: details,
    });
  }
});
/**
 * POST /api/upload/frame
 * Proxy a single webcam frame to the external HF ML service, save logs, return data.
 */
router.post("/frame", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { assignedTo } = req.body;
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: "image/jpeg"
    });

    const ML_BASE = process.env.ML_SERVICE_URL || "https://virtuous-jerrie-unsterile.ngrok-free.dev";
    const NGROK_URL = `${ML_BASE}/analyze-frame`;

    const headers = {
      ...form.getHeaders(),
      "ngrok-skip-browser-warning": "true"
    };

    const mlResponse = await axios.post(NGROK_URL, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 15000, 
    });

    const mlData = mlResponse.data;
    const summary = mlData.summary || [];

    const processedDir = path.join(__dirname, "..", "processed");
    if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

    const frameName = `frame-${Date.now()}.jpg`;
    const localFramePath = path.join(processedDir, frameName);
    fs.copyFileSync(req.file.path, localFramePath);

    // Save detections to MongoDB
    const logEntries = summary.map((item) => {
      const entry = {
        timestamp: new Date(),
        source: "webcam",
        object_class: item.object || item.class || item.object_class || "unknown",
        confidence: item.confidence || 0,
        status: item.status ? item.status.toUpperCase() : (mlData.intrusion_detected ? "INTRUSION" : "UNKNOWN"),
        uploadedBy: req.user._id,
        imageUrl: `/processed/${frameName}`
      };
      if (assignedTo && assignedTo !== "none") {
        entry.assignedTo = assignedTo;
      }
      return entry;
    });

    if (logEntries.length > 0) {
      await DetectionLog.insertMany(logEntries);
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      detections: logEntries,
      raw_output: mlData
    });
  } catch (error) {
    let details = error.response?.data || error.message;
    let errorMessage = "Failed to proxy frame to ML service";

    if (typeof details === "string" && details.includes("<!DOCTYPE html>")) {
      errorMessage = "ML SERVICE OFFLINE: The ngrok tunnel is down. Please restart your ML service and ngrok.";
      details = "ERR_NGROK_OFFLINE";
    }

    console.error("Frame proxy error:", details);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(502).json({
      error: errorMessage,
      details: details,
    });
  }
});

module.exports = router;

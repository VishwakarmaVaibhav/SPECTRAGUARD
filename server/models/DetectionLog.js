/**
 * Spectra Guard — Mongoose Schema: DetectionLog
 * Stores individual object detection events from YOLO processing.
 */

const mongoose = require("mongoose");

const detectionLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ["image", "video", "webcam"],
      required: true,
    },
    object_class: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ["INTRUSION", "AUTHORIZED", "UNKNOWN", "WILDLIFE"],
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for backward compatibility with old data
      index: true,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    cloudinary_id: {
      type: String,
      required: false, // Stores the public_id for easy deletion
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Used when an Admin assigns a live feed detection to one or more officers
    }],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DetectionLog", detectionLogSchema);

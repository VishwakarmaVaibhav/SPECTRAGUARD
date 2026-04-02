const express = require("express");
const User = require("../models/User");
const DetectionLog = require("../models/DetectionLog");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");
const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "https://akshatabhat23-forest-intrusion.hf.space";

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/employees
 * Aggregates data to show a list of police users and their upload stats
 */
router.get("/employees", async (req, res) => {
  try {
    const employees = await User.aggregate([
      {
        $match: { role: "police" }
      },
      {
        $lookup: {
          from: "detectionlogs",
          localField: "_id",
          foreignField: "uploadedBy",
          as: "logs"
        }
      },
      {
        $project: {
          username: 1,
          role: 1,
          createdAt: 1,
          status: { $ifNull: ["$status", "active"] },
          totalUploads: { $size: "$logs" },
          latestActivity: { $max: "$logs.createdAt" }
        }
      },
      {
        $sort: { latestActivity: -1, createdAt: -1 }
      }
    ]);

    res.status(200).json(employees);
  } catch (error) {
    console.error("Admin employees error:", error.message);
    res.status(500).json({ error: "Failed to fetch employees metrics" });
  }
});

/**
 * POST /api/admin/employees
 * Creates a new police user account
 */
router.post("/employees", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const newUser = await User.create({
      username,
      password,
      role: "police",
    });
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      role: newUser.role,
      createdAt: newUser.createdAt,
      totalUploads: 0,
      latestActivity: null
    });
  } catch (error) {
    console.error("Admin create employee error:", error.message);
    res.status(500).json({ error: "Failed to create police account" });
  }
});

/**
 * GET /api/admin/auth/list
 * Proxy to HF Auth List
 */
router.get("/auth/list", async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/auth/list`);
    res.json(response.data);
  } catch (error) {
    console.error("Auth list proxy error:", error.message);
    res.status(500).json({ error: "Failed to fetch authorization registry" });
  }
});

/**
 * POST /api/admin/auth/add
 * Proxy to HF Auth Add
 */
router.post("/auth/add", async (req, res) => {
  try {
    const { image_name, status } = req.body;
    const form = new URLSearchParams();
    form.append("image_name", image_name);
    form.append("status", status);

    const response = await axios.post(`${ML_SERVICE_URL}/auth/add`, form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Auth add proxy error:", error.message);
    res.status(500).json({ error: "Failed to add authorization entry" });
  }
});

/**
 * PUT /api/admin/auth/update
 * Proxy to HF Auth Update
 */
router.put("/auth/update", async (req, res) => {
  try {
    const { image_name, status } = req.body;
    const form = new URLSearchParams();
    form.append("image_name", image_name);
    form.append("status", status);

    const response = await axios.put(`${ML_SERVICE_URL}/auth/update`, form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Auth update proxy error:", error.message);
    res.status(500).json({ error: "Failed to update authorization entry" });
  }
});

/**
 * DELETE /api/admin/auth/delete/:image_name
 * Proxy to HF Auth Delete
 */
router.delete("/auth/delete/:image_name", async (req, res) => {
  try {
    const { image_name } = req.params;
    const response = await axios.delete(`${ML_SERVICE_URL}/auth/delete/${encodeURIComponent(image_name)}`);
    res.json(response.data);
  } catch (error) {
    console.error("Auth delete proxy error:", error.message);
    res.status(500).json({ error: "Failed to delete authorization entry" });
  }
});


/**
 * DELETE /api/admin/employees/:id
 * Deletes a police user account
 */
router.delete("/employees/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/**
 * PATCH /api/admin/employees/:id/status
 * Updates user status (active/suspended)
 */
router.patch("/employees/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

/**
 * DELETE /api/admin/logs/:id
 * Deletes a detection log
 */
router.delete("/logs/:id", async (req, res) => {
  try {
    const log = await DetectionLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ error: "Log not found" });
    // TODO: Ideally delete the image/video from Cloudinary/AWS too if applicable
    res.json({ message: "Evidence log purged successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to purge evidence log" });
  }
});

module.exports = router;

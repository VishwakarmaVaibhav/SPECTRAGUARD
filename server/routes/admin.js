const express = require("express");
const User = require("../models/User");
const DetectionLog = require("../models/DetectionLog");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");

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

module.exports = router;

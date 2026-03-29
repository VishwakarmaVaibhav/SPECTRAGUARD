const express = require("express");
const DetectionLog = require("../models/DetectionLog");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// Require auth for all log routes
router.use(requireAuth);

/**
 * GET /api/logs/police
 * Returns logs where (`uploadedBy` matches user OR is Admin) AND within last 24h
 */
router.get("/police", async (req, res) => {
  try {
    // 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find admin users manually, or we could populate, 
    // but lookup is easier (or aggregate) if we only store uploadedBy.
    // However, an easier query is to lookup the user role in an aggregation,
    // or fetch admin user IDs first.
    
    // For simplicity, let's use Mongoose populate and filter.
    // Or better, aggregate to join User collection and filter by role or self.
    const logs = await DetectionLog.aggregate([
      {
        $match: {
          createdAt: { $gte: oneDayAgo },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "uploadedBy",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { "uploadedBy": req.user._id },
            { "user.role": "admin" },
            { "assignedTo": req.user._id }, // Include logs specifically delegated to this officer
            { "uploadedBy": { $exists: false } } // Include older unassigned logs just in case
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          "user.password": 0,
        }
      }
    ]);

    res.status(200).json(logs);
  } catch (error) {
    console.error("Police logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/**
 * GET /api/logs/admin
 * Returns all logs in the system
 */
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await DetectionLog.find()
      .populate("uploadedBy", "username role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DetectionLog.countDocuments();

    res.status(200).json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch top logs" });
  }
});

module.exports = router;

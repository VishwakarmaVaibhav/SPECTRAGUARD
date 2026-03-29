/**
 * Spectra Guard — Analytics Routes
 * Provides aggregated detection data for the frontend dashboard.
 */

const express = require("express");
const DetectionLog = require("../models/DetectionLog");

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Returns KPI data: total events, intrusions, class breakdown.
 */
router.get("/summary", async (req, res) => {
  try {
    const totalEvents = await DetectionLog.countDocuments();
    const totalIntrusions = await DetectionLog.countDocuments({ status: "INTRUSION" });
    const totalAuthorized = await DetectionLog.countDocuments({ status: "AUTHORIZED" });

    // Intrusion breakdown by class
    const intrusionByClass = await DetectionLog.aggregate([
      { $match: { status: "INTRUSION" } },
      {
        $group: {
          _id: "$object_class",
          count: { $sum: 1 },
          avg_confidence: { $avg: "$confidence" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Detection breakdown by class (all statuses)
    const detectionsByClass = await DetectionLog.aggregate([
      {
        $group: {
          _id: "$object_class",
          count: { $sum: 1 },
          avg_confidence: { $avg: "$confidence" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Source breakdown
    const bySource = await DetectionLog.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      totalEvents,
      totalIntrusions,
      totalAuthorized,
      intrusionByClass,
      detectionsByClass,
      bySource,
    });
  } catch (error) {
    console.error("Analytics summary error:", error.message);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/**
 * GET /api/analytics/logs
 * Returns paginated detection logs, newest first.
 */
router.get("/logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await DetectionLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DetectionLog.countDocuments();

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Analytics logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;

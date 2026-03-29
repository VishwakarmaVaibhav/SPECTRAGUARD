/**
 * Analytics — Dashboard reading from MongoDB.
 * KPI cards, bar chart of intrusion types, and recent detection logs table.
 */

import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import DetectionTable from "../components/DetectionTable";

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, logsRes] = await Promise.all([
        axios.get("/api/analytics/summary"),
        axios.get("/api/analytics/logs?limit=25"),
      ]);
      setSummary(summaryRes.data);
      setLogs(logsRes.data.logs || []);
    } catch (err) {
      setError("Failed to fetch analytics. Ensure backend and MongoDB are running.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = summary?.detectionsByClass?.map((item) => ({
    name: item._id?.toUpperCase() || "UNKNOWN",
    count: item.count,
    confidence: Math.round((item.avg_confidence || 0) * 100),
  })) || [];

  const CHART_COLORS = ["#00ff41", "#ff0000", "#ffbf00", "#ffffff", "#888888"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-sg-green">▤</span> ANALYTICS DASHBOARD
          </h2>
          <p className="text-xs font-mono text-sg-muted mt-1">
            DETECTION METRICS — MONGODB AGGREGATION
          </p>
        </div>
        <button onClick={fetchData} className="sg-btn text-xs">
          ↻ REFRESH
        </button>
      </div>

      {loading && (
        <div className="sg-card text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-sg-green border-t-transparent animate-spin mb-3"></div>
          <p className="font-mono text-sm text-sg-muted">LOADING ANALYTICS...</p>
        </div>
      )}

      {error && (
        <div className="border border-sg-red bg-sg-red/10 px-4 py-3 font-mono text-sm text-sg-red mb-4">
          {error}
        </div>
      )}

      {!loading && summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="TOTAL EVENTS"
              value={summary.totalEvents}
              color="text-white"
            />
            <KPICard
              label="INTRUSIONS"
              value={summary.totalIntrusions}
              color="text-sg-red"
              alert={summary.totalIntrusions > 0}
            />
            <KPICard
              label="AUTHORIZED"
              value={summary.totalAuthorized}
              color="text-sg-green"
            />
            <KPICard
              label="UNIQUE CLASSES"
              value={summary.detectionsByClass?.length || 0}
              color="text-sg-amber"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            {/* Bar Chart */}
            <div className="sg-card">
              <div className="sg-label mb-4">DETECTIONS BY CLASS</div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#888888", fontSize: 10, fontFamily: "Roboto Mono" }}
                      axisLine={{ stroke: "#333333" }}
                    />
                    <YAxis
                      tick={{ fill: "#888888", fontSize: 10, fontFamily: "Roboto Mono" }}
                      axisLine={{ stroke: "#333333" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333333",
                        borderRadius: 0,
                        fontFamily: "Roboto Mono",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#e0e0e0" }}
                    />
                    <Bar dataKey="count" name="Detections">
                      {chartData.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="font-mono text-sm text-sg-muted">
                    [ NO DATA AVAILABLE ]
                  </p>
                </div>
              )}
            </div>

            {/* Source Breakdown */}
            <div className="sg-card">
              <div className="sg-label mb-4">SOURCE BREAKDOWN</div>
              {summary.bySource?.length > 0 ? (
                <div className="space-y-3">
                  {summary.bySource.map((src, i) => {
                    const pct =
                      summary.totalEvents > 0
                        ? Math.round((src.count / summary.totalEvents) * 100)
                        : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs text-sg-text uppercase">
                            {src._id || "UNKNOWN"}
                          </span>
                          <span className="font-mono text-xs text-sg-muted">
                            {src.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-sg-black border border-sg-border">
                          <div
                            className="h-full bg-sg-green transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="font-mono text-sm text-sg-muted">
                    [ NO SOURCE DATA ]
                  </p>
                </div>
              )}

              {/* Intrusion class list */}
              {summary.intrusionByClass?.length > 0 && (
                <div className="mt-6">
                  <div className="sg-label mb-3">INTRUSION CLASSES</div>
                  {summary.intrusionByClass.map((cls, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-sg-border/30">
                      <span className="font-mono text-xs text-sg-red uppercase">
                        {cls._id}
                      </span>
                      <span className="font-mono text-xs text-sg-muted">
                        {cls.count}x — avg {(cls.avg_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Logs */}
          <div>
            <div className="sg-label mb-2">RECENT DETECTION LOGS (LATEST 25)</div>
            <DetectionTable detections={logs} />
          </div>
        </>
      )}
    </div>
  );
}

/** KPI Card sub-component */
function KPICard({ label, value, color, alert }) {
  return (
    <div className={`sg-card ${alert ? "border-sg-red" : ""}`}>
      <div className="sg-label mb-2">{label}</div>
      <div className="flex items-center gap-2">
        {alert && <span className="blink-dot-red"></span>}
        <span className={`text-3xl font-mono font-bold ${color}`}>
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
}

/**
 * Sidebar — Fixed left navigation panel
 * Industrial control panel aesthetic with system status indicator.
 */

import { useState, useEffect } from "react";

export default function Sidebar({ tabs, activeTab, onTabChange }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) =>
    d.toLocaleTimeString("en-US", { hour12: false });

  const formatDate = (d) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

  return (
    <aside className="w-60 h-screen bg-sg-panel border-r border-sg-border flex flex-col shrink-0">
      {/* System Header */}
      <div className="border-b border-sg-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-sg-green"></div>
          <span className="font-mono text-xs text-sg-green tracking-widest">
            SYSTEM ONLINE
          </span>
        </div>
        <h1 className="text-lg font-bold font-mono text-white tracking-wider mt-2">
          SPECTRA<span className="text-sg-green">GUARD</span>
        </h1>
        <p className="text-xs font-mono text-sg-muted mt-1">
          FOREST INTRUSION DETECTION
        </p>
      </div>

      {/* Clock */}
      <div className="border-b border-sg-border px-4 py-3">
        <div className="font-mono text-sg-green text-xl tracking-widest">
          {formatTime(time)}
        </div>
        <div className="font-mono text-xs text-sg-muted mt-1">
          {formatDate(time)}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        <div className="px-4 py-2">
          <span className="sg-label">CONTROL PANEL</span>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-4 py-3 font-mono text-sm flex items-center gap-3 transition-colors duration-150 border-l-2 ${activeTab === tab.id
                ? "bg-sg-card border-sg-green text-sg-green"
                : "border-transparent text-sg-muted hover:text-sg-text hover:bg-sg-black"
              }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* System Status Footer */}
      <div className="border-t border-sg-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-sg-muted">ML ENGINE</span>
          <div className="flex items-center gap-2">
            <span className="blink-dot"></span>
            <span className="text-xs font-mono text-sg-green">ACTIVE</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-sg-muted">DATABASE</span>
          <div className="flex items-center gap-2">
            <span className="blink-dot"></span>
            <span className="text-xs font-mono text-sg-green">CONNECTED</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-sg-muted">MODEL</span>
          <span className="text-xs font-mono text-sg-text">YOLOv11n</span>
        </div>
      </div>
    </aside>
  );
}

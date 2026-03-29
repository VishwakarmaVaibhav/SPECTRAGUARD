/**
 * VideoMode — Upload and process a video through YOLO.
 * Shows annotated video player + scrolling detection log.
 */

import { useState, useRef } from "react";
import axios from "axios";

export default function VideoMode({ token }) {
  const [file, setFile] = useState(null);
  const [annotatedUrl, setAnnotatedUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);
  const logBoxRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setAnnotatedUrl(null);
    setDetections([]);
    setError(null);
    setStats(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/upload/video", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
        timeout: 300000,
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      setAnnotatedUrl(res.data.annotated_url);
      setDetections(res.data.detections || []);
      setStats({
        total: res.data.total_detections,
        frames: res.data.frames_processed,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Video processing failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnnotatedUrl(null);
    setDetections([]);
    setError(null);
    setStats(null);
  };

  const intrusionCount = detections.filter((d) => d.status === "INTRUSION").length;

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-sg-green">▶</span> VIDEO ANALYSIS MODE
          </h2>
          <p className="text-xs font-mono text-sg-muted mt-1">
            UPLOAD VIDEO → FRAME-BY-FRAME YOLO → ANNOTATED OUTPUT
          </p>
        </div>
        {file && (
          <button onClick={handleReset} className="sg-btn text-xs">
            ✕ CLEAR
          </button>
        )}
      </div>

      {/* Alert */}
      {intrusionCount > 0 && (
        <div className="border-2 border-sg-red bg-sg-red/10 px-4 py-3 mb-4 flex items-center gap-3">
          <span className="blink-dot-red"></span>
          <span className="font-mono text-sm text-sg-red font-bold tracking-wider">
            ⚠ {intrusionCount} INTRUSION EVENT{intrusionCount > 1 ? "S" : ""} IN VIDEO
          </span>
        </div>
      )}

      {/* Upload Zone */}
      {!file && (
        <div
          className={`upload-zone p-8 ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="text-4xl text-sg-border mb-4">▶</div>
          <p className="font-mono text-sm text-sg-muted">
            DRAG & DROP VIDEO FILE HERE
          </p>
          <p className="font-mono text-xs text-sg-border mt-2">
            OR CLICK TO BROWSE — MP4, AVI, MOV, MKV
          </p>
        </div>
      )}

      {/* File Selected — Process */}
      {file && !annotatedUrl && (
        <div className="space-y-4">
          <div className="sg-card">
            <div className="flex items-center gap-3">
              <span className="text-2xl text-sg-muted">▶</span>
              <div>
                <div className="font-mono text-sm text-white">{file.name}</div>
                <div className="font-mono text-xs text-sg-muted">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="sg-card">
              <div className="sg-label mb-2">PROCESSING VIDEO...</div>
              <div className="w-full h-2 bg-sg-black border border-sg-border">
                <div
                  className="h-full bg-sg-green transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="font-mono text-xs text-sg-muted mt-2">
                {progress < 100
                  ? `UPLOADING... ${progress}%`
                  : "RUNNING YOLO INFERENCE — PLEASE WAIT..."}
              </div>
            </div>
          )}

          {!loading && (
            <button onClick={handleProcess} className="sg-btn-primary">
              ▶ PROCESS VIDEO
            </button>
          )}

          {error && (
            <div className="border border-sg-red bg-sg-red/10 px-4 py-2 font-mono text-sm text-sg-red">
              ERROR: {error}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {annotatedUrl && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Video Player */}
          <div className="xl:col-span-2 sg-card">
            <div className="sg-label mb-2">ANNOTATED VIDEO OUTPUT</div>
            <video
              src={annotatedUrl}
              controls
              className="w-full border border-sg-border bg-black"
            />
            {stats && (
              <div className="flex gap-4 mt-3">
                <span className="font-mono text-xs text-sg-muted">
                  FRAMES: {stats.frames}
                </span>
                <span className="font-mono text-xs text-sg-muted">
                  DETECTIONS: {stats.total}
                </span>
                <span className="font-mono text-xs text-sg-red">
                  INTRUSIONS: {intrusionCount}
                </span>
              </div>
            )}
          </div>

          {/* Detection Log */}
          <div>
            <div className="sg-label mb-2">DETECTION LOG</div>
            <div className="log-box" ref={logBoxRef} style={{ maxHeight: "500px" }}>
              {detections.length === 0 ? (
                <div className="text-sg-muted">[ NO DETECTIONS ]</div>
              ) : (
                detections.map((det, i) => (
                  <div key={i} className="log-entry">
                    <span className="text-sg-muted">
                      [{String(det.frame ?? i).padStart(4, "0")}]
                    </span>{" "}
                    <span
                      className={
                        det.status === "INTRUSION"
                          ? "text-sg-red"
                          : "text-sg-green"
                      }
                    >
                      {det.status}
                    </span>{" "}
                    <span className="text-white">{det.object_class}</span>{" "}
                    <span className="text-sg-muted">
                      ({(det.confidence * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

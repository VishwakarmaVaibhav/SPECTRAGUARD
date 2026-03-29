/**
 * ImageMode — Upload and process a single image through YOLO.
 * Shows annotated result + detection data table.
 */

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import DetectionTable from "../components/DetectionTable";

export default function ImageMode({ token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [annotatedUrl, setAnnotatedUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            // Create a file object with a proper name
            const pastedFile = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
            handleFile(pastedFile);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnnotatedUrl(null);
    setDetections([]);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/upload/image", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });

      setAnnotatedUrl(res.data.annotated_url);
      setDetections(res.data.detections || []);
    } catch (err) {
      const msg = err.response?.data?.error || "Processing failed.";
      const detail = err.response?.data?.details;
      setError(detail ? `${msg} (DETAILS: ${JSON.stringify(detail)})` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setAnnotatedUrl(null);
    setDetections([]);
    setError(null);
  };

  const intrusionCount = detections.filter((d) => d.status === "INTRUSION").length;

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-sg-green">◩</span> IMAGE ANALYSIS MODE
          </h2>
          <p className="text-xs font-mono text-sg-muted mt-1">
            UPLOAD IMAGE → YOLO PROCESSING → THREAT CLASSIFICATION
          </p>
        </div>
        {file && (
          <button onClick={handleReset} className="sg-btn text-xs">
            ✕ CLEAR
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {intrusionCount > 0 && (
        <div className="border-2 border-sg-red bg-sg-red/10 px-4 py-3 mb-4 flex items-center gap-3">
          <span className="blink-dot-red"></span>
          <span className="font-mono text-sm text-sg-red font-bold tracking-wider">
            ⚠ ALERT: {intrusionCount} INTRUSION{intrusionCount > 1 ? "S" : ""} DETECTED
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
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="text-4xl text-sg-border mb-4">◩</div>
          <p className="font-mono text-sm text-sg-muted">
            DRAG & DROP IMAGE FILE HERE
          </p>
          <p className="font-mono text-xs text-sg-border mt-2">
            OR CLICK TO BROWSE — JPG, PNG, BMP, WEBP
          </p>
        </div>
      )}

      {/* Preview + Process */}
      {file && !annotatedUrl && (
        <div className="space-y-4">
          <div className="sg-card">
            <div className="sg-label mb-2">SELECTED FILE: {file.name}</div>
            <img
              src={preview}
              alt="Preview"
              className="max-h-[500px] w-auto mx-auto border border-sg-border"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleProcess}
              disabled={loading}
              className="sg-btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-sg-green border-t-transparent animate-spin"></span>
                  PROCESSING...
                </>
              ) : (
                "▶ PROCESS IMAGE"
              )}
            </button>
          </div>
          {error && (
            <div className="border border-sg-red bg-sg-red/10 px-4 py-2 font-mono text-sm text-sg-red">
              ERROR: {error}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {annotatedUrl && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Annotated Image */}
          <div className="sg-card">
            <div className="sg-label mb-2">ANNOTATED OUTPUT</div>
            <div className="relative">
              <img
                src={annotatedUrl}
                alt="Annotated result"
                className="w-full border border-sg-border"
              />
              <div className="scanline-overlay"></div>
            </div>
          </div>

          {/* Detection Table */}
          <div>
            <div className="sg-label mb-2">
              DETECTION REPORT — {detections.length} OBJECT{detections.length !== 1 ? "S" : ""}
            </div>
            <DetectionTable detections={detections} compact />
          </div>
        </div>
      )}
    </div>
  );
}

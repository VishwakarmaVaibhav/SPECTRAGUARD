import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function WebcamMode({ token }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [officers, setOfficers] = useState([]);
  const [assignedTo, setAssignedTo] = useState("none");
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // 1. On Mount: Get officers and available cameras
  useEffect(() => {
    fetchOfficers();
    getAvailableCameras();

    return () => {
      stopCamera();
    };
  }, []);

  const fetchOfficers = async () => {
    try {
      const res = await axios.get("/api/admin/employees", authConfig);
      setOfficers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch officers", err);
    }
  };

  const getAvailableCameras = async () => {
    try {
      // Do NOT prompt for permission here. Just enumerate devices if available.
      // If permissions haven't been granted, labels might be empty but deviceId might exist.
      const currentDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = currentDevices.filter(d => d.kind === "videoinput");
      setDevices(videoInputs);
      if (videoInputs.length > 0) {
        setSelectedDevice(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate devices initially.", err);
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const constraints = {
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setConnected(true);
      
      // Update device labels now that we have permission
      const currentDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = currentDevices.filter(d => d.kind === "videoinput");
      setDevices(videoInputs);

      // Start inference interval
      intervalRef.current = setInterval(captureAndAnalyzeFrame, 1500); // Send frame every 1.5 seconds

    } catch (err) {
      setError("Failed to start camera feed.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setConnected(false);
  };

  const captureAndAnalyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== 4) return; // Wait until ready

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      uploadFrame(blob);
    }, "image/jpeg", 0.7);
  };

  const uploadFrame = async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");
    formData.append("assignedTo", assignedTo);

    try {
      const res = await axios.post("/api/upload/frame", formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
      });
      
      const { detections } = res.data;
      if (detections && detections.length > 0) {
        const newLogs = detections.map(d => ({
          ts: new Date().toLocaleTimeString(),
          class: d.object_class || d.class || "Unknown",
          confidence: d.confidence || 0,
          status: d.status || "UNKNOWN"
        }));
        
        setLogs(prev => {
          const combined = [...newLogs, ...prev];
          return combined.slice(0, 100); // Keep last 100 logs
        });
      }
    } catch (err) {
      console.error("Frame upload failed:", err);
    }
  };

  const activeIntrusionsCount = logs.slice(0, 5).filter(l => l.status === "INTRUSION").length;

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-sg-green">◉</span> LIVE SURVEILLANCE MODE
        </h2>
        <p className="text-xs font-mono text-sg-muted mt-1">
          REAL-TIME CAMERA FEED → CONTINUOUS ML MONITORING
        </p>
      </div>

      {error && (
        <div className="border-2 border-sg-red bg-sg-red/10 px-4 py-3 mb-4 font-mono text-sm text-sg-red">
          ⚠ ERROR: {error}
        </div>
      )}

      {activeIntrusionsCount > 0 && (
         <div className="border-2 border-sg-red bg-sg-red/10 px-4 py-3 mb-4 flex items-center gap-3">
           <span className="blink-dot-red"></span>
           <span className="font-mono text-sm text-sg-red font-bold tracking-wider">
             ⚠ ACTIVE INTRUSION DETECTED ON LIVE FEED
           </span>
         </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Camera Feed Area */}
        <div className="xl:col-span-2">
          <div className="sg-card relative bg-black flex items-center justify-center p-0 overflow-hidden" style={{ minHeight: "480px" }}>
            
            {!connected && (
              <div className="absolute inset-0 flex items-center justify-center border border-sg-border m-4 z-10">
                <div className="text-center">
                  <div className="text-6xl text-sg-border mb-4">◉</div>
                  <p className="font-mono text-sm text-sg-muted mb-1">CAMERA FEED — OFFLINE</p>
                  <p className="font-mono text-xs text-sg-border">NO ACTIVE CONNECTION</p>
                </div>
              </div>
            )}

            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full max-h-[600px] object-contain transition-opacity duration-300 ${connected ? "opacity-100" : "opacity-0"}`}
            />
            {/* Hidden canvas for extraction */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Corner brackets overlay */}
            <div className="pointer-events-none absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-sg-green/40"></div>
            <div className="pointer-events-none absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-sg-green/40"></div>
            <div className="pointer-events-none absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-sg-green/40"></div>
            <div className="pointer-events-none absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-sg-green/40"></div>
            {/* Scan line overlay */}
            {connected && <div className="scanline-overlay"></div>}
          </div>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          <div className="sg-card">
            <div className="sg-label mb-3">CAMERA CONFIGURATION</div>
            <div className="space-y-4">
              <div>
                <label className="sg-label mb-1 block">VIDEO SOURCE</label>
                <select 
                  className="sg-input w-full"
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  disabled={connected}
                >
                  {devices.length === 0 && <option>NO CAMERAS DETECTED</option>}
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="sg-label mb-1 block">ASSIGN LOGS TO OFFICER</label>
                <select 
                  className="sg-input w-full border-sg-amber text-sg-amber"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={connected}
                >
                  <option value="none">[ UNASSIGNED (ADMIN ONLY) ]</option>
                  {officers.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.username.toUpperCase()}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-sg-muted mt-1 leading-tight">
                  Selected officer will receive real-time detection logs from this camera on their mobile dashboard.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={connected ? stopCamera : startCamera}
            className={connected ? "sg-btn-danger w-full py-4 text-base" : "sg-btn-primary w-full py-4 text-base"}
          >
            {connected ? "■ HALT FEED" : "◉ INITIATE LIVE FEED"}
          </button>

          <div className="sg-card">
             <div className="flex justify-between items-center mb-2">
               <div className="sg-label">LIVE EVENT STREAM</div>
               {logs.length > 0 && (
                 <button onClick={() => setLogs([])} className="text-xs font-mono text-sg-muted hover:text-white">CLEAR</button>
               )}
             </div>
             
             <div className="log-box pr-2 overflow-y-auto" style={{ maxHeight: "300px" }}>
               {logs.length === 0 ? (
                 <div className="text-sg-muted font-mono text-xs">
                   {connected ? "[ SCANNING FOR OBJECTS... ]" : "[ AWAITING CAMERA CONNECTION ]"}
                 </div>
               ) : (
                 logs.map((log, i) => (
                   <div key={i} className="log-entry font-mono border-b border-sg-border/30 pb-1 mb-1">
                     <span className="text-sg-muted text-[10px] w-16 inline-block">[{log.ts}]</span>
                     <span className={`text-xs ml-2 ${log.status === "INTRUSION" ? "text-sg-red animate-pulse font-bold" : "text-sg-green"}`}>
                       ■ {log.status}
                     </span>
                     <span className="text-white text-xs ml-2 uppercase">{log.class}</span>
                     <span className="text-sg-muted text-xs float-right">{(Number(log.confidence) * 100).toFixed(0)}%</span>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

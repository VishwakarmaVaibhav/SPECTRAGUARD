import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function WebcamMode({ 
  token,
  webcamActive,
  setWebcamActive,
  webcamStream,
  setWebcamStream,
  liveLogs,
  setLiveLogs,
  selectedCamera,
  setSelectedCamera,
  assignedOfficers,
  setAssignedOfficers
}) {
  const [devices, setDevices] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const mediaExplorerRef = useRef(null); 
  const mediaRecorderRef = useRef(null);

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // 1. On Mount: Get officers and available cameras
  useEffect(() => {
    fetchOfficers();
    getAvailableCameras();
  }, []);

  // Synchronize video element with the stream whenever it changes
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') console.error("Video play failed", e);
        });
      }
    }
  }, [webcamStream]);

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
      if (videoInputs.length > 0 && !selectedCamera) {
        setSelectedCamera(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate devices initially.", err);
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const constraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setWebcamStream(stream);
      setWebcamActive(true);
      
      // Update device labels now that we have permission
      const currentDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = currentDevices.filter(d => d.kind === "videoinput");
      setDevices(videoInputs);

      initRecorder(stream);

    } catch (err) {
      setError("Failed to start camera feed.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
    }
    setWebcamStream(null);
    setWebcamActive(false);
  };

  const flipCamera = async () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex].deviceId;
    
    setSelectedCamera(nextDevice);
    if (webcamActive) {
      stopCamera();
      // Wait a moment for hardware to release
      setTimeout(() => startCameraWithDevice(nextDevice), 500);
    }
  };

  const startCameraWithDevice = async (deviceId) => {
    setError(null);
    try {
      const constraints = { video: { deviceId: { exact: deviceId } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setWebcamStream(stream);
      setWebcamActive(true);
      initRecorder(stream);
    } catch (err) {
      setError("Failed to switch camera.");
    }
  };

  const initRecorder = (stream) => {
    // Check if the current device is a front-facing camera
    const currentDevice = devices.find(d => d.deviceId === selectedCamera);
    const useMirror = currentDevice?.label?.toLowerCase().includes("front") || 
                      currentDevice?.label?.toLowerCase().includes("user");

    let finalStream = stream;

    // If mirroring is needed, we proxy through a canvas
    if (useMirror) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // We need these to match the video stream resolution
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      canvas.width = settings.width || 640;
      canvas.height = settings.height || 480;

      const drawFrame = () => {
        if (!webcamActive) return;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        requestAnimationFrame(drawFrame);
      };
      
      // Start the proxy loop
      requestAnimationFrame(drawFrame);
      finalStream = canvas.captureStream(25); // 25 FPS
    }

    const options = { mimeType: 'video/webm;codecs=vp8' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm';
    
    const recorder = new MediaRecorder(finalStream, options);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) uploadVideoChunk(event.data);
    };
    recorder.start(4000); // Reverted to 4s for ML service stability
  };

  const trackingRef = useRef({}); // Persistence for duration tracking: { label: { start: Number, lastSeen: Number } }

  const uploadVideoChunk = async (blob) => {
    const formData = new FormData();
    const startTimeStamp = Date.now();
    const fileName = `chunk-${startTimeStamp}.webm`;
    formData.append("file", blob, fileName);
    formData.append("assignedTo", JSON.stringify(assignedOfficers));

    try {
      const res = await axios.post("/api/upload/video", formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
      });
      
      const { detections } = res.data;
      const now = Date.now();
      
      if (detections && detections.length > 0) {
        // Track the current frame's detected classes
        const seenCurrent = new Set();
        
        const newLogs = detections.map(d => {
          const label = d.object_class || d.class || "Unknown";
          seenCurrent.add(label);
          
          // Persistence Logic
          if (!trackingRef.current[label]) {
            trackingRef.current[label] = { start: now, lastSeen: now };
          } else {
            trackingRef.current[label].lastSeen = now;
          }
          
          const durationSec = Math.floor((trackingRef.current[label].lastSeen - trackingRef.current[label].start) / 1000);
          
          return {
            ts: new Date().toLocaleTimeString(),
            object_class: label,
            confidence: d.confidence || 0,
            status: d.status || "UNKNOWN",
            duration: durationSec > 0 ? `${durationSec}s` : "NEW"
          };
        });

        // Cleanup: Objects not seen in this chunk for more than a buffer (e.g. 6s) are considered gone
        Object.keys(trackingRef.current).forEach(label => {
          if (!seenCurrent.has(label)) {
            const idleTime = now - trackingRef.current[label].lastSeen;
            if (idleTime > 6000) delete trackingRef.current[label];
          }
        });
        
        setLiveLogs(prev => {
          const combined = [...newLogs, ...prev];
          return combined.slice(0, 100); 
        });
      }
    } catch (err) {
      console.error("Video chunk upload failed:", err);
    }
  };

  const activeIntrusionsCount = liveLogs.slice(0, 5).filter(l => l.status === "INTRUSION").length;

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-sg-green">◉</span> LIVE SURVEILLANCE MODE
        </h2>
        <p className="text-xs font-mono text-sg-muted mt-1">
          REAL-TIME VIDEO STREAM → 4S CHUNKED ML ANALYSIS
        </p>
      </div>

      {error && (
        <div className="border-2 border-sg-red bg-sg-red/10 px-4 py-3 mb-4 font-mono text-sm text-sg-red">
          ⚠ ERROR: {error}
        </div>
      )}

      {liveLogs.slice(0, 3).some(l => l.status === "INTRUSION") && (
         <div className="border-2 border-sg-red bg-sg-red/10 px-4 py-3 mb-4 flex items-center gap-3 animate-pulse">
           <span className="h-3 w-3 bg-sg-red rounded-full"></span>
           <span className="font-mono text-sm text-sg-red font-bold tracking-wider">
             ⚠ LIVE_SIGNAL: INTRUSION_ALERT_ACTIVE
           </span>
         </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Camera Feed Area */}
        <div className="xl:col-span-2">
          <div className="sg-card relative bg-black flex items-center justify-center p-0 overflow-hidden" style={{ minHeight: "480px" }}>
            
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center border border-sg-border m-4 z-10">
                <div className="text-center">
                  <div className="text-6xl text-sg-border mb-4">◉</div>
                  <p className="font-mono text-sm text-sg-muted mb-1">DATA SIGNAL — OFFLINE</p>
                  <p className="font-mono text-xs text-sg-border">NO ACTIVE FEED SESSION</p>
                </div>
              </div>
            )}

            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full max-h-[600px] object-contain transition-opacity duration-300 ${webcamActive ? "opacity-100" : "opacity-0"} ${
                (devices.find(d => d.deviceId === selectedCamera)?.label?.toLowerCase().includes("front") || 
                 devices.find(d => d.deviceId === selectedCamera)?.label?.toLowerCase().includes("user")) ? "mirrored-preview" : ""
              }`}
            />
            
            {/* Corner brackets overlay */}
            <div className="pointer-events-none absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-sg-green/40"></div>
            <div className="pointer-events-none absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-sg-green/40"></div>
            <div className="pointer-events-none absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-sg-green/40"></div>
            <div className="pointer-events-none absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-sg-green/40"></div>
            {/* Scan line overlay */}
            {webcamActive && <div className="scanline-overlay"></div>}
          </div>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          <div className="sg-card">
            <div className="sg-label mb-3">CAMERA CONFIGURATION</div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select 
                  className="sg-input flex-1"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  disabled={webcamActive}
                >
                  {devices.length === 0 && <option>NO CAMERAS DETECTED</option>}
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={flipCamera}
                  className="bg-sg-panel border border-sg-border p-2 hover:border-sg-green"
                  title="Flip Camera"
                >
                  🔄
                </button>
              </div>

              <div>
                <label className="sg-label mb-2 block">ASSIGN LOGS TO PERSONNEL (MULTI-SELECT)</label>
                <div className="max-h-32 overflow-y-auto border border-sg-border bg-sg-black p-2 space-y-1">
                  {officers.map(o => (
                    <label key={o._id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1">
                      <input 
                        type="checkbox"
                        checked={assignedOfficers.includes(o._id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedOfficers([...assignedOfficers, o._id]);
                          else setAssignedOfficers(assignedOfficers.filter(id => id !== o._id));
                        }}
                        className="accent-sg-green"
                      />
                      <span className="text-xs font-mono text-white uppercase">{o.username}</span>
                    </label>
                  ))}
                  {officers.length === 0 && <div className="text-[10px] text-sg-muted italic">NO PERSONNEL REGISTERED</div>}
                </div>
                <p className="text-[8px] font-mono text-sg-muted mt-2 leading-tight">
                  Selected personnel will receive real-time detection telemetry for this channel.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={webcamActive ? stopCamera : startCamera}
            className={webcamActive ? "sg-btn-danger w-full py-4 text-base" : "sg-btn-primary w-full py-4 text-base"}
          >
            {webcamActive ? "■ TERMINATE FEED" : "◉ INITIATE PERSISTENT FEED"}
          </button>

          <div className="sg-card">
             <div className="flex justify-between items-center mb-2">
               <div className="sg-label">LIVE DATA PREVIEW (REAL-TIME)</div>
               {liveLogs.length > 0 && (
                 <button onClick={() => setLiveLogs([])} className="text-xs font-mono text-sg-muted hover:text-white">PURGE_TEMP</button>
               )}
             </div>
             
             <div className="log-box pr-2 overflow-y-auto" style={{ maxHeight: "300px" }}>
               {liveLogs.length === 0 ? (
                 <div className="text-sg-muted font-mono text-[10px]">
                   {webcamActive ? "[ SIGNAL_ESTABLISHED: AWAITING_DETECTION... ]" : "[ STANDBY: SELECT_SOURCE_AND_INITIATE ]"}
                 </div>
               ) : (
                 liveLogs.map((log, i) => (
                   <div key={i} className="log-entry font-mono border-b border-sg-border/30 pb-1 mb-1 animate-in fade-in slide-in-from-right duration-300">
                     <span className="text-sg-muted text-[9px] w-14 inline-block">[{log.ts}]</span>
                     <span className={`text-[10px] ml-1 ${log.status === "INTRUSION" ? "text-sg-red font-bold" : log.status === "AUTHORIZED" ? "text-sg-green" : "text-white"}`}>
                       ■ {log.status}
                     </span>
                      <span className="text-white text-[10px] ml-1 uppercase">{log.object_class}</span>
                      <span className="text-sg-green text-[9px] ml-2 font-bold px-1 border border-sg-green/30">{log.duration}</span>
                      <span className="text-sg-muted text-[10px] float-right">{(Number(log.confidence) * 100).toFixed(0)}%</span>
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

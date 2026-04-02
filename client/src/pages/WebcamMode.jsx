import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { RefreshCcw, Monitor, MonitorOff } from "lucide-react";

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
  const [mirrorActive, setMirrorActive] = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const restartTimerRef = useRef(null);

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // 1. On Mount: Get officers and available cameras
  useEffect(() => {
    fetchOfficers();
    getAvailableCameras();
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  // Synchronize video element with the stream
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(e => {
        if (e.name !== 'AbortError') console.error("Video play failed", e);
      });
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
      
      const currentDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = currentDevices.filter(d => d.kind === "videoinput");
      setDevices(videoInputs);

      // Auto-mirror if it looks like a front camera
      const label = videoInputs.find(d => d.deviceId === (selectedCamera || videoInputs[0].deviceId))?.label?.toLowerCase() || "";
      if (label.includes("front") || label.includes("user")) setMirrorActive(true);

      initRecorder(stream);
    } catch (err) {
      setError("Failed to start camera feed.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
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

  /**
   * INITIATE RECORDER (Standalone Loop)
   * This logic stops and starts the recorder every 4 seconds.
   * Why? To ensure each chunk is a valid standalone WebM file with proper headers
   * for the ML service to parse correctly.
   */
  const initRecorder = (stream) => {
    if (!stream || stream.getVideoTracks().length === 0) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm';
      
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          uploadVideoChunk(event.data);
        }
      };

      recorder.onstop = () => {
        // If still active, start a new 4s session
        if (webcamActive && stream.active) {
          restartTimerRef.current = setTimeout(() => {
            if (webcamActive) initRecorder(stream);
          }, 100); 
        }
      };

      recorder.start();

      // Cycle every 4 seconds to create a standalone video file
      restartTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 4000);

    } catch (e) {
      console.error("MediaRecorder init failed", e);
    }
  };

  const trackingRef = useRef({});

  const uploadVideoChunk = async (blob) => {
    const formData = new FormData();
    const fileName = `chunk-${Date.now()}.webm`;
    formData.append("file", blob, fileName);
    formData.append("assignedTo", JSON.stringify(assignedOfficers));

    try {
      const res = await axios.post("/api/upload/video", formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
      });
      
      const { detections } = res.data;
      const now = Date.now();
      
      if (detections && detections.length > 0) {
        const seenCurrent = new Set();
        const newLogs = detections.map(d => {
          const label = d.object_class || d.class || "Unknown";
          seenCurrent.add(label);
          
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

        // Cleanup stale objects
        Object.keys(trackingRef.current).forEach(label => {
          if (!seenCurrent.has(label)) {
            if (now - trackingRef.current[label].lastSeen > 8000) delete trackingRef.current[label];
          }
        });
        
        setLiveLogs(prev => [...newLogs, ...prev].slice(0, 50));
      }
    } catch (err) {
      console.error("[WebcamMode] Chunk analysis failed:", err.response?.data || err.message);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-sg-green">◉</span> LIVE SURVEILLANCE
          </h2>
          <p className="text-[10px] font-mono text-sg-muted mt-1 uppercase">
            STANDALONE_CHUNK_PROCESSOR_V2 | CYCLE: 4000MS
          </p>
        </div>
        
        {webcamActive && (
          <div className="flex gap-2">
            <button 
              onClick={() => setMirrorActive(!mirrorActive)}
              className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] border transition-all ${mirrorActive ? "border-sg-green bg-sg-green/10 text-sg-green" : "border-sg-border text-sg-muted"}`}
            >
              {mirrorActive ? <Monitor size={12}/> : <MonitorOff size={12}/>}
              {mirrorActive ? "MIRROR: ON" : "MIRROR: OFF"}
            </button>
            <button 
              onClick={flipCamera}
              className="flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] border border-sg-border hover:border-sg-green text-white transition-all bg-sg-panel"
            >
              <RefreshCcw size={12} className="animate-spin-slow"/> FLIP_SIGNAL
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="border border-sg-red bg-sg-red/10 px-4 py-3 mb-4 font-mono text-[12px] text-sg-red flex items-center gap-3">
          <span className="animate-pulse">⚠</span> {error}
        </div>
      )}

      {liveLogs.slice(0, 3).some(l => l.status === "INTRUSION") && (
         <div className="border border-sg-red bg-sg-red/20 px-4 py-3 mb-4 flex items-center gap-3 animate-pulse">
           <span className="h-2 w-2 bg-sg-red rounded-full"></span>
           <span className="font-mono text-xs text-sg-red font-bold tracking-widest uppercase">
             INTRUSION_ALERT_ACTIVE
           </span>
         </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="sg-card relative bg-black flex items-center justify-center p-0 overflow-hidden" style={{ minHeight: "440px" }}>
            
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center border border-sg-border/20 m-4 z-10 bg-black/40">
                <div className="text-center">
                  <div className="text-4xl text-sg-border/30 mb-4 font-mono tracking-tighter">DATA_OFFLINE</div>
                  <button 
                    onClick={startCamera} 
                    className="sg-btn-primary px-8 py-3 text-xs"
                  >
                    INITIATE_HANDSHAKE
                  </button>
                </div>
              </div>
            )}

            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full max-h-[600px] object-contain transition-all duration-700 ${webcamActive ? "opacity-100 scale-100" : "opacity-0 scale-95"} ${mirrorActive ? "mirrored-preview" : ""}`}
            />
            
            <div className="pointer-events-none absolute top-4 left-4 w-6 h-6 border-l border-t border-sg-green/30"></div>
            <div className="pointer-events-none absolute top-4 right-4 w-6 h-6 border-r border-t border-sg-green/30"></div>
            <div className="pointer-events-none absolute bottom-4 left-4 w-6 h-6 border-l border-b border-sg-green/30"></div>
            <div className="pointer-events-none absolute bottom-4 right-4 w-6 h-6 border-r border-b border-sg-green/30"></div>
            {webcamActive && <div className="scanline-overlay pointer-events-none"></div>}
            
            {webcamActive && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 border border-sg-border/30 font-mono text-[9px] text-sg-green tracking-widest z-10 flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-sg-green rounded-full animate-pulse"></span>
                STREAMING_NODE_01
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={webcamActive ? stopCamera : startCamera}
              className={`flex-1 font-mono text-sm tracking-[0.2em] font-bold py-4 transition-all border-2 ${webcamActive ? "border-sg-red text-sg-red hover:bg-sg-red/10" : "border-sg-green text-sg-green hover:bg-sg-green/10"}`}
            >
              {webcamActive ? "■ TERMINATE_SIGNAL" : "▶ INITIATE_SESSION"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="sg-card bg-sg-panel/30">
            <div className="sg-label flex justify-between mb-3">
              <span>CORE_CONFIGURATION</span>
              <span className="text-sg-green">SIGNAL_STRENGTH: 98%</span>
            </div>
            <div className="space-y-4">
              <select 
                className="sg-input w-full uppercase text-[11px]"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                disabled={webcamActive}
              >
                {devices.length === 0 && <option>DETECTION_ENGINE_STANDBY</option>}
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label.toUpperCase() || `CAMERA_NODE_${d.deviceId.substring(0, 4)}`}
                  </option>
                ))}
              </select>

              <div>
                <label className="sg-label mb-2 block">ASSIGN_REVENUE_PROTECTION</label>
                <div className="max-h-32 overflow-y-auto border border-sg-border/20 bg-black/40 p-2 space-y-1">
                  {officers.map(o => (
                    <label key={o._id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1 group">
                      <input 
                        type="checkbox"
                        checked={assignedOfficers.includes(o._id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedOfficers([...assignedOfficers, o._id]);
                          else setAssignedOfficers(assignedOfficers.filter(id => id !== o._id));
                        }}
                        className="accent-sg-green w-3 h-3"
                      />
                      <span className="text-[10px] font-mono text-white/70 group-hover:text-sg-green transition-colors uppercase tracking-tighter">
                        {o.username}
                      </span>
                    </label>
                  ))}
                  {officers.length === 0 && <div className="text-[10px] text-sg-muted italic text-center py-4">NO_NODES_FOUND</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="sg-card bg-sg-panel/10 flex-1 border-dashed">
             <div className="flex justify-between items-center mb-4">
               <div className="sg-label">REAL_TIME_TELEMETRY</div>
               {liveLogs.length > 0 && (
                 <button onClick={() => setLiveLogs([])} className="text-[9px] font-mono text-sg-muted hover:text-sg-red tracking-widest border border-sg-border/30 px-2">PURGE</button>
               )}
             </div>
             
             <div className="log-box !bg-transparent !p-0 custom-scrollbar" style={{ maxHeight: "310px" }}>
               {liveLogs.length === 0 ? (
                 <div className="text-sg-muted/50 font-mono text-[9px] text-center mt-20 italic">
                   {webcamActive ? "[ ANALYZING_CONTINUUM... ]" : "[ SIGNAL_DORMANT ]"}
                 </div>
               ) : (
                 liveLogs.map((log, i) => (
                   <div key={i} className="log-entry font-mono border-b border-sg-border/10 pb-2 mb-2 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className={`h-1.5 w-1.5 rounded-full ${log.status === "INTRUSION" ? "bg-sg-red shadow-[0_0_5px_#ff0000]" : "bg-sg-green"}`}></span>
                       <span className="text-[10px] text-white uppercase">{log.object_class}</span>
                       {log.status === "INTRUSION" && <span className="text-[8px] bg-sg-red text-white px-1 font-bold">ALERT</span>}
                     </div>
                     <div className="text-right flex flex-col items-end">
                       <div className="text-[9px] text-sg-muted">{log.ts}</div>
                       <div className="text-[9px] text-sg-green">{log.duration}</div>
                     </div>
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

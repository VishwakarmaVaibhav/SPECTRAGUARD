import { useState, useRef, useEffect } from "react";
import axios from "axios";
import DetectionTable from "../components/DetectionTable";

export default function PoliceDashboard({ token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [annotatedUrl, setAnnotatedUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanMode, setScanMode] = useState("image"); // 'image' | 'video'
  const [progress, setProgress] = useState(0);
  
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Axios config factory mapped with token
  const authConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const lastLogIdRef = useRef(null);
  const isFirstFetchRef = useRef(true);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    fetchRecentActivity();

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const pastedFile = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
            setScanMode("image");
            handleFile(pastedFile);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    // Refresh activity every 4 seconds for real-time alerts
    const interval = setInterval(fetchRecentActivity, 4000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); 

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio Context not supported or allowed", e);
    }
  };

  const triggerBrowserNotification = (log) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const uploader = log.user?.username ? log.user.username.toUpperCase() : "SYSTEM";
      new Notification(`⚠ INTRUSION ALERT - SpectraGuard`, {
        body: `Threat: ${log.object_class.toUpperCase()} \nConfidence: ${(log.confidence * 100).toFixed(0)}%\nSource: ${uploader}`,
        requireInteraction: true
      });
    }
  };

  const fetchRecentActivity = async () => {
    if (isFirstFetchRef.current) setLogsLoading(true);
    try {
      const res = await axios.get("/api/logs/police", authConfig);
      const fetchedLogs = res.data;

      if (!isFirstFetchRef.current && fetchedLogs.length > 0) {
        const lastIndex = fetchedLogs.findIndex((l) => l._id === lastLogIdRef.current);
        const newLogs = lastIndex === -1 ? fetchedLogs : fetchedLogs.slice(0, lastIndex);
        
        const newIntrusions = newLogs.filter(l => l.status === "INTRUSION");
        if (newIntrusions.length > 0) {
          playAlertSound();
          triggerBrowserNotification(newIntrusions[0]);
        }
      }

      if (fetchedLogs.length > 0) {
        lastLogIdRef.current = fetchedLogs[0]._id;
      }
      
      isFirstFetchRef.current = false;
      setRecentLogs(fetchedLogs);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      if (isFirstFetchRef.current) setLogsLoading(false);
    }
  };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnnotatedUrl(null);
    setDetections([]);
    setError(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = scanMode === "image" ? "/api/upload/image" : "/api/upload/video";
      const config = {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
        timeout: scanMode === "video" ? 300000 : 30000,
      };

      if (scanMode === "video") {
        config.onUploadProgress = (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        };
      }

      const res = await axios.post(endpoint, formData, config);

      setAnnotatedUrl(res.data.annotated_url);
      setDetections(res.data.detections || []);
      // Refresh feed immediately after upload
      fetchRecentActivity();
    } catch (err) {
      setError(err.response?.data?.error || "Processing failed.");
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
    setProgress(0);
  };

  const intrusionCount = detections.filter((d) => d.status === "INTRUSION").length;  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="w-full min-h-screen flex flex-col gap-6 p-2 md:p-6 max-w-4xl mx-auto pb-20 custom-scrollbar">
      
      {/* Enlarged Image/Video Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="w-full max-w-3xl relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
             <button 
               className="absolute -top-10 right-0 text-white font-mono text-lg hover:text-sg-green"
               onClick={() => setSelectedImage(null)}
             >✕ CLOSE</button>
             {/\.(mp4|webm|mov)$/i.test(selectedImage) ? (
               <video src={selectedImage} controls autoPlay className="w-full border border-sg-border shadow-2xl bg-black" />
             ) : (
               <img src={selectedImage} alt="Enlarged Evidence" className="w-full border border-sg-border shadow-2xl bg-black" />
             )}
          </div>
        </div>
      )}

      {/* Header (Mobile Optimized) */}
      <div className="border-b border-sg-border pb-4">
        <h2 className="text-2xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-sg-green">◩</span> FIELD UNIT V.1
        </h2>
        <p className="text-sm font-mono text-sg-muted mt-2">
          RAPID MEDIA ANALYSIS & LOCAL 24H ACTIVITY
        </p>
      </div>

      {/* Main Upload / Action Area */}
      <div className="sg-card p-4 md:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="sg-label text-lg">NEW SCAN</div>
          {/* Toggle Buttons */}
          <div className="flex items-center gap-2">
            <button 
              className={`font-mono text-[10px] md:text-xs px-3 py-1.5 border ${scanMode === 'image' ? 'border-sg-green text-sg-green bg-sg-green/10' : 'border-sg-border text-sg-muted hover:text-white'}`}
              onClick={() => { setScanMode('image'); handleReset(); }}
            >
              ◩ IMAGE
            </button>
            <button 
              className={`font-mono text-[10px] md:text-xs px-3 py-1.5 border ${scanMode === 'video' ? 'border-sg-green text-sg-green bg-sg-green/10' : 'border-sg-border text-sg-muted hover:text-white'}`}
              onClick={() => { setScanMode('video'); handleReset(); }}
            >
              ▶ VIDEO
            </button>
          </div>
        </div>
        
        {/* State 1: Awaiting Upload */}
        {!file && (
          <div 
            className="w-full min-h-[250px] border-2 border-dashed border-sg-border bg-sg-black hover:border-sg-green hover:bg-sg-panel transition-all active:bg-sg-green/10 flex flex-col items-center justify-center cursor-pointer p-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={scanMode === "image" ? "image/*" : "video/*"}
              capture={scanMode === "image" ? "environment" : undefined}
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="text-5xl text-sg-border mb-4">{scanMode === "image" ? "📷" : "▶"}</div>
            <p className="font-mono text-lg text-white font-bold text-center">
              TAP TO UPLOAD OR CAPTURE {scanMode.toUpperCase()}
            </p>
          </div>
        )}

        {/* State 2: Preview & Process */}
        {file && !annotatedUrl && (
          <div className="flex flex-col gap-4">
            {scanMode === "image" ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-[400px] object-contain border border-sg-border bg-black"
              />
            ) : (
              <div className="sg-card bg-black border border-sg-border p-4 flex items-center gap-3">
                <span className="text-2xl text-sg-muted">▶</span>
                <div>
                  <div className="font-mono text-sm text-white">{file.name}</div>
                  <div className="font-mono text-xs text-sg-muted">{(file.size / (1024 * 1024)).toFixed(1)} MB</div>
                </div>
              </div>
            )}

            {scanMode === "video" && loading && (
              <div className="w-full h-2 bg-sg-black border border-sg-border mt-2">
                <div
                  className="h-full bg-sg-green transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
                <div className="font-mono text-[10px] text-sg-muted mt-1">
                  {progress < 100 ? `UPLOADING... ${progress}%` : "ANALYZING VIDEO (INFERENCE IN PROGRESS)..."}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 mt-2">
              <button
                onClick={handleProcess}
                disabled={loading}
                className="sg-btn-primary w-full py-4 text-lg flex justify-center items-center gap-2"
              >
                {loading ? "PROCESSING..." : "▶ RUN ANALYSIS"}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="sg-btn w-full md:w-auto py-4 text-lg bg-sg-black"
              >
                ✕ CANCEL
              </button>
            </div>
            
            {error && (
              <div className="border-2 border-sg-red bg-sg-red/10 p-4 font-mono text-sg-red text-center font-bold">
                {error}
              </div>
            )}
          </div>
        )}

        {/* State 3: Results */}
        {annotatedUrl && (
          <div className="flex flex-col gap-4">
            {intrusionCount > 0 && (
              <div className="border-2 border-sg-red bg-sg-red/10 p-4 flex flex-col items-center gap-2 text-center">
                <span className="blink-dot-red w-4 h-4"></span>
                <span className="font-mono text-xl text-sg-red font-bold tracking-wider">
                  THREAT DETECTED: {intrusionCount}
                </span>
              </div>
            )}
            
            {scanMode === "image" ? (
              <img
                src={annotatedUrl}
                alt="Annotated result"
                className="w-full border border-sg-border bg-black"
              />
            ) : (
              <video
                src={annotatedUrl}
                controls
                className="w-full max-h-[400px] border border-sg-border bg-black"
              />
            )}
            
            <DetectionTable detections={detections} compact />
            
            <button
              onClick={handleReset}
              className="sg-btn border-sg-text hover:bg-sg-text hover:text-black w-full py-4 text-lg mt-2"
            >
              ◩ NEW SCAN
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity Feed (24h) */}
      <div className="sg-card p-0 shadow-xl flex flex-col min-h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-sg-border bg-sg-panel flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
             <span className="blink-dot"></span>
             <div className="sg-label text-base m-0">24H ACTIVITY LOG</div>
          </div>
          <button onClick={fetchRecentActivity} className="text-sg-muted text-xl p-2 active:text-white hover:text-sg-green transition-colors">
            ↻
          </button>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 bg-sg-black relative">
          <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-50"></div>
          <div className="relative z-10 flex flex-col gap-3">
            {logsLoading && recentLogs.length === 0 && (
              <div className="text-sg-muted font-mono text-sm text-center py-10 w-full flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-sg-green border-t-transparent animate-spin mb-4"></div>
                SYNCING SECURE CONNECTION...
              </div>
            )}
            
            {!logsLoading && recentLogs.length === 0 && (
               <div className="text-sg-muted font-mono text-sm text-center py-12 border border-sg-border/50 bg-sg-panel/30">
                 [ NO ACTIVITY LOGGED IN PAST 24H ]
               </div>
            )}

            {recentLogs.map((log) => {
              const time = new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const isIntrusion = log.status === "INTRUSION";
              const uploader = log.user?.username ? log.user.username.toUpperCase() : "UNKNOWN";
              const isAdmin = log.user?.role === "admin";
              
              return (
                <div 
                  key={log._id} 
                  className={`flex flex-col border border-sg-border/50 bg-sg-panel/40 p-3 relative overflow-hidden group hover:border-sg-text transition-colors`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${isIntrusion ? 'bg-sg-red animate-pulse' : 'bg-sg-green'}`}></div>
                  
                  <div className="flex justify-between items-start mb-1 pl-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-sm tracking-wider ${isIntrusion ? 'text-sg-red' : 'text-sg-green'}`}>
                        {log.object_class.toUpperCase()}
                      </span>
                      {isIntrusion && <span className="px-1 text-[9px] font-mono bg-sg-red text-white">THREAT</span>}
                    </div>
                    <span className="font-mono text-[10px] text-sg-muted bg-sg-black px-2 py-0.5 border border-sg-border/50">{time}</span>
                  </div>
                  
                  <div className="flex justify-between items-end pl-2 mt-2">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] text-sg-muted mb-0.5">CONFIDENCE MAP</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-sg-black border border-sg-border/50 overflow-hidden">
                          <div 
                            className={`h-full ${isIntrusion ? 'bg-sg-red' : 'bg-sg-green'}`} 
                            style={{ width: `${(log.confidence * 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-xs text-white">{(log.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {log.imageUrl && (
                        <button 
                          onClick={() => setSelectedImage(log.imageUrl)}
                          className="font-mono text-[10px] text-sg-green border border-sg-green px-2 py-1 hover:bg-sg-green hover:text-black transition-all"
                        >
                          VIEW EVIDENCE
                        </button>
                      )}
                      <div className="flex flex-col text-right">
                        <span className="font-mono text-[9px] text-sg-muted mb-0.5">SOURCE</span>
                        <span className={`font-mono text-[11px] font-bold ${isAdmin ? 'text-sg-amber' : 'text-sg-text'}`}>
                          {uploader}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

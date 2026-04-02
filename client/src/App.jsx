import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import PoliceDashboard from "./pages/PoliceDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DocumentPage from "./pages/DocumentPage";
import Hero from "./pages/Hero";
import ProfileView from "./pages/ProfileView";
import Footer from "./components/Footer";
import { User } from "lucide-react";
import { Link } from "react-router-dom";

const DOCS_CONTENT = `SPECTRA GUARD V.1 
CORE ARCHITECTURE DOCUMENTATION

1. OVERVIEW
Spectra Guard is a high-performance forest intrusion detection system designed to operate in real-time edge environments. 

2. NEURAL NETWORK
The system utilizes YOLO (You Only Look Once) architecture for sub-second object detection, specifically trained on diverse datasets of human and wildlife profiles.

3. FIELD UNIT OPERATIONS
Field units (Police/Rangers) can capture or upload media from their mobile terminals. The ML engine provides immediate confidence bounding boxes and threat alerts.`;

const TERMS_CONTENT = `SPECTRA GUARD - TERMS OF SERVICE

1. AUTHORIZATION
Access to the Spectra Guard terminal is strictly restricted to authorized administrative personnel and active field units.

2. DATA HANDLING
All uploaded media and detection logs are property of the local forestry department and are bound by internal security compliances.

3. UNAUTHORIZED ACCESS
Attempts to bypass the JWT authentication layers or tamper with the Mongo detection logs will result in immediate API blackout and internal auditing.`;

const PRIVACY_CONTENT = `SPECTRA GUARD - PRIVACY POLICY

1. SURVEILLANCE DATA
Media captured by field units is temporarily stored for ML processing and permanently logged only if an intrusion is detected. Routine scans of safe wildlife are strictly anonymized.

2. PERSONNEL TRACKING
Field unit activity is logged for administrative oversight. Location and upload velocity metrics are stored securely within the encrypted database.`;

function App() {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    // Attempt to load auth state from local storage on mount
    const savedAuth = localStorage.getItem("sg_auth");
    if (savedAuth) {
      setAuth(JSON.parse(savedAuth));
    }
  }, []);

  const handleLogin = (data) => {
    setAuth(data);
    localStorage.setItem("sg_auth", JSON.stringify(data));
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem("sg_auth");
  };

  return (
    <div className="flex flex-col min-h-screen w-screen bg-sg-black overflow-x-hidden">
      {/* Global Top Bar */}
      {auth && (
        <header className="h-16 shrink-0 bg-sg-panel border-b border-sg-border flex items-center justify-between px-4 md:px-6 relative z-20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-sg-green animate-pulse"></div>
            <Link to="/" className="font-mono text-sm md:text-base text-white tracking-widest font-bold hover:opacity-80 transition-opacity">
              SPECTRA<span className="text-sg-green">GUARD</span> <span className="text-sg-muted opacity-50 hidden md:inline">| {auth.role.toUpperCase()} TERMINAL</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] md:text-xs text-sg-muted hidden sm:inline uppercase">
                NODE_SIGNAL: <span className="text-sg-green">ACTIVE</span>
              </span>
              <Link 
                to={auth.role === "admin" ? "/admin/profile" : "/profile"} 
                className="flex items-center gap-2 px-3 py-1.5 border border-sg-border bg-sg-black hover:border-sg-green transition-all group"
              >
                <User size={14} className="text-sg-muted group-hover:text-sg-green" />
                <span className="font-mono text-[10px] md:text-xs text-white uppercase font-bold tracking-tighter">
                  {auth.username}
                </span>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative bg-sg-black flex flex-col">
        <div className="scanline-overlay pointer-events-none"></div>
        <div className="relative z-10 w-full flex-1">
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/login" element={
              auth ? (
                auth.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <PoliceDashboard token={auth.token} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } />
            
            <Route path="/docs" element={<DocumentPage title="System Documentation" content={DOCS_CONTENT} />} />
            <Route path="/terms" element={<DocumentPage title="Terms & Conditions" content={TERMS_CONTENT} />} />
            <Route path="/privacy" element={<DocumentPage title="Privacy Policy" content={PRIVACY_CONTENT} />} />
            
            {/* Catch-all for authenticated dashboards */}
            <Route path="*" element={
              !auth ? (
                <Navigate to="/login" replace />
              ) : auth.role === "police" ? (
                <div className="w-full"> 
                   <Routes>
                     <Route path="/" element={<PoliceDashboard token={auth.token} auth={auth} onLogout={handleLogout} />} />
                     <Route path="/profile" element={<ProfileView auth={auth} onLogout={handleLogout} />} />
                     <Route path="*" element={<Navigate to="/" replace />} />
                   </Routes>
                </div>
              ) : auth.role === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <div className="font-mono text-center mt-20 text-sg-red">UNRECOGNIZED CLEARANCE LEVEL</div>
              )
            } />
            
            {/* Admin specific nested route wildcard */}
            {auth && auth.role === "admin" && (
              <Route path="/admin/*" element={<AdminDashboard token={auth.token} auth={auth} onLogout={handleLogout} />} />
            )}
          </Routes>
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default App;

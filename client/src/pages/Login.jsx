import { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevSetup = async () => {
    try {
      await axios.post("/api/auth/setup");
      alert("Seed accounts generated: admin/password and officer_1/password");
    } catch (err) {
      alert("Setup failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sg-black relative p-4">
      <div className="scanline-overlay"></div>
      
      <div className="z-10 w-full max-w-md">
        <div className="sg-card bg-black border-2 border-sg-border p-6 shadow-2xl relative">
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-sg-green"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-sg-green"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-sg-green"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-sg-green"></div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-mono text-white tracking-widest">
              SPECTRA<span className="text-sg-green">GUARD</span>
            </h1>
            <p className="text-xs font-mono text-sg-muted mt-2 tracking-widest">
              AUTHORIZED PERSONNEL ONLY
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="sg-label block mb-2">IDENTIFICATION CODE</label>
              <input
                type="text"
                className="sg-input w-full text-lg p-3 bg-sg-panel"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="USER_ID"
                autoComplete="off"
                required
              />
            </div>
            
            <div>
              <label className="sg-label block mb-2">ACCESS PIN / PASSWORD</label>
              <input
                type="password"
                className="sg-input w-full text-lg p-3 bg-sg-panel"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="border border-sg-red bg-sg-red/10 px-4 py-3 font-mono text-sm text-sg-red text-center">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sg-btn-primary py-4 text-lg mt-4 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-sg-green border-t-transparent animate-spin"></span>
                  AUTHENTICATING...
                </>
              ) : (
                "INITIATE CONNECTION"
              )}
            </button>
          </form>

          {/* Dev Seed Button */}
          <div className="mt-8 text-center border-t border-sg-border/50 pt-4">
            <button 
              onClick={handleDevSetup}
              className="text-xs font-mono text-sg-muted hover:text-sg-amber transition-colors"
            >
              [ RUN DB SETUP SCRIPT ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

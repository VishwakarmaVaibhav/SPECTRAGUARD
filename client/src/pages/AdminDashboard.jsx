import { useState, useEffect } from "react";
import axios from "axios";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import Sidebar from "../components/Sidebar";
import ImageMode from "./ImageMode";
import VideoMode from "./VideoMode";
import WebcamMode from "./WebcamMode";

const ADMIN_TABS = [
  { id: "dashboard", label: "COMMAND CENTER", icon: "▤" },
  { id: "staff", label: "STAFF MANAGEMENT", icon: "👤" },
  { id: "image", label: "IMAGE ANALYSIS", icon: "◩" },
  { id: "video", label: "VIDEO ANALYSIS", icon: "▶" },
  { id: "webcam", label: "LIVE FEED [BETA]", icon: "◉" },
];

export default function AdminDashboard({ token }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract the current tab from the URL, defaulting to "dashboard"
  const getActiveTab = () => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    return ADMIN_TABS.find((t) => t.id === lastPart) ? lastPart : "dashboard";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (id) => {
    navigate(`/admin/${id}`);
  };

  return (
    <div className="flex w-full h-full pb-16 md:pb-0 overflow-hidden">
      {/* Sidebar hidden on small screens, shown on md+ */}
      <div className="hidden md:block">
        <Sidebar tabs={ADMIN_TABS} activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 w-full">
        <Routes>
          <Route path="dashboard" element={<CommandCenterView token={token} />} />
          <Route path="staff" element={<StaffManagementView token={token} />} />
          <Route path="image" element={<ImageMode token={token} />} />
          <Route path="video" element={<VideoMode token={token} />} />
          <Route path="webcam" element={<WebcamMode token={token} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-sg-panel border-t border-sg-border flex z-50 overflow-x-auto">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${
              activeTab === tab.id ? "text-sg-green border-t-2 border-sg-green bg-sg-card" : "text-sg-muted"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-mono mt-1 whitespace-nowrap px-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CommandCenterView({ token }) {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, logsRes, employeesRes] = await Promise.all([
        axios.get("/api/analytics/summary", authConfig),
        axios.get("/api/logs/admin?limit=25", authConfig),
        axios.get("/api/admin/employees", authConfig),
      ]);
      setSummary(summaryRes.data);
      setLogs(logsRes.data.logs || []);
      setEmployees(employeesRes.data || []);
    } catch (err) {
      setError("Failed to fetch admin data. Ensure you have admin privileges and connection is stable.");
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Evidence Modal stays the same */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="w-full max-w-4xl relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
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

      <div className="flex items-center justify-between mb-6 border-b border-sg-border pb-4">
        <div>
          <h2 className="text-2xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-sg-green">▤</span> COMMAND CENTER
          </h2>
          <p className="text-sm font-mono text-sg-muted mt-1">
            GLOBAL SURVEILLANCE & PERSONNEL TRACKING
          </p>
        </div>
        <button onClick={fetchData} className="sg-btn text-sm px-6 py-2">
          ↻ SYNC
        </button>
      </div>

      {loading && (
        <div className="sg-card text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-sg-green border-t-transparent animate-spin mb-4"></div>
          <p className="font-mono text-lg text-sg-muted">GATHERING GLOBAL INTELLIGENCE...</p>
        </div>
      )}

      {error && (
        <div className="border border-sg-red bg-sg-red/10 px-4 py-4 font-mono text-base text-sg-red mb-6 shadow-xl">
          {error}
        </div>
      )}

      {!loading && summary && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
            <KPICard label="TOTAL EVENTS" value={summary.totalEvents} color="text-white" />
            <KPICard label="INTRUSIONS" value={summary.totalIntrusions} color="text-sg-red" alert={summary.totalIntrusions > 0} />
            <KPICard label="AUTHORIZED" value={summary.totalAuthorized} color="text-sg-green" />
            <KPICard label="ACTIVE FIELD UNITS" value={employees.filter(e => e.totalUploads > 0).length} color="text-sg-amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 flex-[1.2] min-h-0">
            <div className="xl:col-span-2 sg-card flex flex-col overflow-hidden">
              <div className="sg-label mb-4">DETECTIONS AGGREGATE</div>
              <div className="flex-1 min-h-0">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                      <XAxis dataKey="name" tick={{ fill: "#888888", fontSize: 11, fontFamily: "Roboto Mono" }} axisLine={{ stroke: "#333333" }} />
                      <YAxis tick={{ fill: "#888888", fontSize: 11, fontFamily: "Roboto Mono" }} axisLine={{ stroke: "#333333" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", borderRadius: 0, fontFamily: "Roboto Mono", fontSize: 13 }}
                        labelStyle={{ color: "#e0e0e0" }}
                      />
                      <Bar dataKey="count" name="Detections">
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="font-mono text-sm text-sg-muted">[ NO DATA ]</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sg-card flex flex-col overflow-hidden">
              <div className="sg-label mb-4">PERSONNEL ACTIVITY (FIELD UNITS)</div>
              <div className="overflow-y-auto flex-1 pr-2 min-h-0">
                {employees.length === 0 ? (
                  <p className="font-mono text-sm text-sg-muted text-center py-4">[ NO UNITS FOUND ]</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {employees.map(emp => (
                      <div key={emp._id} className="border border-sg-border p-3 bg-sg-black flex justify-between">
                        <div>
                          <div className="font-mono text-white font-bold">{emp.username.toUpperCase()}</div>
                          <div className="font-mono text-xs text-sg-muted mt-1">
                            L.A: {emp.latestActivity ? new Date(emp.latestActivity).toLocaleString() : 'NEVER'}
                          </div>
                        </div>
                        <div className="font-mono text-xs px-2 py-1 h-fit bg-sg-panel text-sg-green border border-sg-green/30">
                          {emp.totalUploads} SCANS
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sg-card flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="sg-label mb-4">GLOBAL SYSTEM LOGS</div>
            <div className="flex-1 overflow-y-auto">
              <table className="sg-table w-full">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>TS</th>
                    <th>UPLOADER</th>
                    <th>CLASS</th>
                    <th>CONF</th>
                    <th>STATUS</th>
                    <th>EVIDENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-sg-muted">[ NO GLOBAL LOGS ]</td></tr>
                  ) : (
                    logs.map((log) => {
                      const ts = new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                      const uploader = log.uploadedBy?.username ? log.uploadedBy.username.toUpperCase() : "SYSTEM";
                      return (
                        <tr key={log._id}>
                          <td className="text-sg-muted whitespace-nowrap">{ts}</td>
                          <td className="text-sg-text">{uploader}</td>
                          <td className="uppercase whitespace-nowrap">{log.object_class}</td>
                          <td>{(log.confidence * 100).toFixed(1)}%</td>
                          <td className={
                            log.status === "INTRUSION" ? "status-intrusion" :
                            log.status === "WILDLIFE" ? "status-authorized" :
                            log.status === "AUTHORIZED" ? "status-authorized" : "status-unknown"
                          }>■ {log.status}</td>
                          <td>
                            {log.imageUrl ? (
                              <button 
                                onClick={() => setSelectedImage(log.imageUrl)}
                                className="text-sg-green border border-sg-green px-2 py-0.5 text-[10px] hover:bg-sg-green hover:text-black transition-all"
                              >
                                VIEW
                              </button>
                            ) : (
                              <span className="text-sg-muted text-[10px]">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffManagementView({ token }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create user form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/employees", authConfig);
      setEmployees(res.data);
    } catch (err) {
      setError("Failed to fetch staff roster.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      await axios.post("/api/admin/employees", { username: newUsername, password: newPassword }, authConfig);
      setCreateSuccess(`Account '${newUsername}' registered successfully.`);
      setNewUsername("");
      setNewPassword("");
      fetchEmployees(); // Refresh roster
    } catch (err) {
      setCreateError(err.response?.data?.error || "Failed to create user.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-sg-border pb-4">
        <div>
          <h2 className="text-2xl font-mono font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-sg-green">👤</span> STAFF MANAGEMENT
          </h2>
          <p className="text-sm font-mono text-sg-muted mt-1">
            REGISTER FIELD UNITS AND MONITOR ACTIVITY
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Create User Form */}
        <div className="md:col-span-1">
          <div className="sg-card h-full">
            <div className="sg-label mb-4">REGISTER NEW FIELD UNIT</div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-sg-muted mb-1">UNIT CALLSIGN / USERNAME</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="sg-input w-full p-2 bg-sg-black text-white font-mono"
                  placeholder="e.g. officer_99"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-sg-muted mb-1">INITIAL PASSCODE</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="sg-input w-full p-2 bg-sg-black text-white font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>

              {createError && (
                <div className="text-xs font-mono text-sg-red bg-sg-red/10 border border-sg-red p-2 mt-2">
                  ⚠ {createError}
                </div>
              )}
              {createSuccess && (
                <div className="text-xs font-mono text-sg-green bg-sg-green/10 border border-sg-green p-2 mt-2">
                  ✓ {createSuccess}
                </div>
              )}

              <button 
                type="submit" 
                disabled={createLoading}
                className="sg-btn-primary w-full py-3 mt-4"
              >
                {createLoading ? "AUTHORIZING..." : "REGISTER UNIT"}
              </button>
            </form>
          </div>
        </div>

        {/* Staff Roster */}
        <div className="md:col-span-2 flex flex-col min-h-0 overflow-hidden">
          <div className="sg-card h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="sg-label">ACTIVE FIELD UNIT ROSTER</div>
              <button onClick={fetchEmployees} className="text-sg-muted text-lg hover:text-white">↻</button>
            </div>
            
            {loading ? (
              <div className="text-center text-sg-muted font-mono py-10">LOADING ROSTER...</div>
            ) : error ? (
              <div className="text-sg-red text-center font-mono py-10">{error}</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <table className="sg-table w-full">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th>CALLSIGN</th>
                      <th>REGISTRATION DATE</th>
                      <th>UPLOAD VOL.</th>
                      <th>LAST SIGNAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr><td colSpan="4" className="text-center text-sg-muted py-8">NO UNITS REGISTERED</td></tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp._id}>
                          <td className="font-bold text-white uppercase">{emp.username}</td>
                          <td className="text-sg-muted">{new Date(emp.createdAt).toLocaleDateString()}</td>
                          <td className="text-sg-green">{emp.totalUploads} SCANS</td>
                          <td className="text-sg-muted">{emp.latestActivity ? new Date(emp.latestActivity).toLocaleString() : 'OFFLINE'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function KPICard({ label, value, color, alert }) {
  return (
    <div className={`sg-card ${alert ? "border-sg-red" : ""}`}>
      <div className="sg-label mb-2">{label}</div>
      <div className="flex items-center gap-2">
        {alert && <span className="blink-dot-red"></span>}
        <span className={`text-3xl lg:text-4xl font-mono font-bold ${color}`}>
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
}

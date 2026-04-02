import { useState, useEffect } from "react";
import axios from "axios";
import { 
  ShieldCheck, 
  Trash2, 
  UserPlus, 
  ShieldAlert, 
  RefreshCcw,
  Search,
  Lock,
  Unlock
} from "lucide-react";

const AuthRegistry = ({ token }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  
  // Form State
  const [newEntry, setNewEntry] = useState({ image_name: "", status: "authorized" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/auth/list", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      console.error("Fetch auth registry error:", err);
      setError("Failed to load authorization database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEntry.image_name) return;
    setIsSubmitting(true);
    try {
      await axios.post("/api/admin/auth/add", newEntry, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewEntry({ image_name: "", status: "authorized" });
      fetchEntries();
    } catch (err) {
      alert("Failed to add entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status.toLowerCase() === "authorized" ? "intrusion" : "authorized";
    try {
      await axios.put("/api/admin/auth/update", {
        image_name: item.image_name,
        status: nextStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEntries();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (imageName) => {
    if (!window.confirm(`Delete ${imageName} from registry?`)) return;
    try {
      await axios.delete(`/api/admin/auth/delete/${encodeURIComponent(imageName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEntries();
    } catch (err) {
      alert("Failed to delete entry");
    }
  };

  const filteredEntries = entries.filter(e => 
    e.image_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-sg-black font-mono overflow-hidden">
      {/* Header Area */}
      <div className="p-6 border-b border-sg-border bg-sg-panel shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <ShieldCheck className="text-sg-green" />
              AUTHORIZATION_REGISTRY
            </h2>
            <p className="text-xs text-sg-muted mt-1">Manage personnel/vehicle whitelisting for AI inference</p>
          </div>
          <button 
            onClick={fetchEntries}
            className="sg-btn text-xs px-4 py-2 flex items-center gap-2 border-sg-green text-sg-green self-start"
            disabled={loading}
          >
            <RefreshCcw className={loading ? "animate-spin" : ""} size={14} />
            REFRESH_SYNC
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Add Form */}
        <div className="w-full md:w-80 border-r border-sg-border p-6 bg-sg-black overflow-y-auto">
          <h3 className="text-sm font-bold text-sg-green mb-4 flex items-center gap-2">
            <UserPlus size={16} />
            REGISTER_NEW_ENTITY
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-sg-muted">Entity Identifier (Filename)</label>
              <input 
                type="text"
                placeholder="e.g. ranger_01.jpg"
                className="w-full bg-sg-panel border border-sg-border p-2 text-sm text-white focus:outline-none focus:border-sg-green"
                value={newEntry.image_name}
                onChange={e => setNewEntry({...newEntry, image_name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-sg-muted">Initial Status</label>
              <select 
                className="w-full bg-sg-panel border border-sg-border p-2 text-sm text-white focus:outline-none focus:border-sg-green"
                value={newEntry.status}
                onChange={e => setNewEntry({...newEntry, status: e.target.value})}
              >
                <option value="authorized">AUTHORIZED</option>
                <option value="intrusion">INTRUSION (BLACKLIST)</option>
              </select>
            </div>
            <button 
              type="submit"
              disabled={isSubmitting || !newEntry.image_name}
              className="w-full sg-btn bg-sg-green/10 border-sg-green text-sg-green py-2 text-xs font-bold hover:bg-sg-green hover:text-black transition-colors"
            >
              {isSubmitting ? "PROCESSING..." : "WHITELIST_ENTITY"}
            </button>
          </form>

          <div className="mt-8 p-4 bg-sg-panel border border-sg-border border-l-2 border-l-sg-green">
            <div className="flex gap-2 text-sg-green mb-1">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-bold">PROTOCOL_INFO</span>
            </div>
            <p className="text-[10px] text-sg-muted leading-relaxed">
              Whitelisted filenames will bypass "Intrusion" alerts. The AI labels them as "Authorized" if a filename match is found in the registry.
            </p>
          </div>
        </div>

        {/* Right: List View */}
        <div className="flex-1 flex flex-col bg-sg-black/50 overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-sg-border bg-sg-black flex items-center gap-3">
            <Search size={18} className="text-sg-muted" />
            <input 
              type="text"
              placeholder="FILTER_BY_IDENTIFIER..."
              className="bg-transparent text-sm text-white w-full focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="text-[10px] text-sg-muted shrink-0">
              {filteredEntries.length} RECORDS_FOUND
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto scrollbar-custom">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-12 h-1 border-t-2 border-sg-green animate-pulse"></div>
                <span className="text-xs text-sg-muted animate-pulse">SYNCING_WITH_CENTRAL_REGISTRY...</span>
              </div>
            ) : error ? (
              <div className="p-10 text-center text-sg-red">
                <ShieldAlert className="mx-auto mb-2" size={32} />
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-sg-panel z-10">
                  <tr className="text-sg-muted text-[10px] uppercase border-b border-sg-border">
                    <th className="px-6 py-3 font-medium">Identifier (Filename)</th>
                    <th className="px-6 py-3 font-medium">Access Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sg-border/50">
                  {filteredEntries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm text-white font-mono">{item.image_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-2 py-1 text-[10px] font-bold border ${
                          item.status.toLowerCase() === "authorized" 
                            ? "border-sg-green/40 text-sg-green bg-sg-green/5" 
                            : "border-sg-red/40 text-sg-red bg-sg-red/5"
                        }`}>
                          {item.status.toLowerCase() === "authorized" ? <Lock size={12} /> : <Unlock size={12} />}
                          {item.status.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleToggleStatus(item)}
                            className="bg-sg-panel border border-sg-border p-1.5 hover:border-sg-green hover:text-sg-green"
                            title="Toggle Access"
                          >
                            <RefreshCcw size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.image_name)}
                            className="bg-sg-panel border border-sg-border p-1.5 hover:border-sg-red hover:text-sg-red"
                            title="Purge Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-20 text-center text-sg-muted italic text-sm">
                        NO_MATCHING_RECORDS_INTERNAL_DATABASE
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthRegistry;

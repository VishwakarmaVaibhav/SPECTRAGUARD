import { User, Shield, LogOut, Clock } from "lucide-react";

export default function ProfileView({ auth, onLogout }) {
  if (!auth) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 max-w-2xl mx-auto">
      <div className="sg-card w-full animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center gap-6 pb-8 border-b border-sg-border/30">
          <div className="w-24 h-24 rounded-full bg-sg-panel border-4 border-sg-green flex items-center justify-center shadow-lg shadow-sg-green/10">
            <User className="text-sg-green" size={48} />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-mono font-bold text-white tracking-widest uppercase">
              {auth.username}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Shield size={14} className="text-sg-amber" />
              <span className="font-mono text-xs text-sg-amber tracking-tighter uppercase font-bold">
                CLEARANCE_LEVEL: {auth.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
          <div className="bg-sg-black/40 border border-sg-border/20 p-4 font-mono">
            <div className="text-[10px] text-sg-muted mb-1 flex items-center gap-2">
              <Clock size={12} /> SESSION_TYPE
            </div>
            <div className="text-sm text-white uppercase">{auth.token ? "ENCRYPTED_JWT" : "LOCAL_AUTH"}</div>
          </div>
          <div className="bg-sg-black/40 border border-sg-border/20 p-4 font-mono">
            <div className="text-[10px] text-sg-muted mb-1 flex items-center gap-2">
              <Activity size={12} /> ACCESS_NODE
            </div>
            <div className="text-sm text-white uppercase">{window.location.hostname.toUpperCase()}</div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={onLogout}
            className="w-full sg-btn-danger py-4 flex items-center justify-center gap-3 group transition-all"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-mono font-bold tracking-widest">DISCONNECT TERMINAL</span>
          </button>
          <p className="text-[10px] font-mono text-sg-muted text-center mt-4 uppercase tracking-tighter">
            Warning: Disconnecting will invalidate the current session token immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

function Activity({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

import { useNavigate } from "react-router-dom";

export default function DocumentPage({ title, content }) {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pt-12 pb-24">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 font-mono text-xs text-sg-muted hover:text-white flex items-center gap-2 transition-colors"
      >
        <span>←</span> RETURN TO TERMINAL
      </button>

      <div className="sg-card p-6 md:p-10 shadow-xl bg-sg-panel relative overflow-hidden text-left border border-sg-border">
        <div className="absolute top-0 left-0 w-full h-1 bg-sg-green"></div>
        
        <div className="flex items-center gap-3 mb-8 border-b border-sg-border pb-4">
          <div className="w-4 h-4 bg-sg-green animate-pulse"></div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-white tracking-widest uppercase">
            {title}
          </h1>
        </div>
        
        <div className="font-mono text-sm md:text-base text-sg-muted leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </div>
    </div>
  );
}

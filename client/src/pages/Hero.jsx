import { Shield, Eye, Lock, Zap, ChevronRight, Activity, Globe, Database } from "lucide-react";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <div className="relative min-h-screen bg-sg-black text-white selection:bg-sg-green selection:text-black font-mono overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,65,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px' 
        }}></div>
        {/* Animated Scanline */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          <div className="w-full h-[2px] bg-sg-green animate-scanline shadow-[0_0_15px_#00ff41]"></div>
        </div>
      </div>

      {/* Navigation Layer */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-8 border-b border-sg-border/20 backdrop-blur-md bg-sg-black/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-sg-panel border border-sg-green flex items-center justify-center shadow-[0_0_10px_rgba(0,255,65,0.2)]">
            <Shield className="text-sg-green" size={20} />
          </div>
          <span className="text-lg md:text-2xl font-bold tracking-[0.2em] uppercase">
            SPECTRA<span className="text-sg-green">GUARD</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.3em] font-bold text-sg-muted">
          <span className="hover:text-sg-green transition-colors cursor-default">SYSTEM_STATUS: <span className="text-sg-green">OPTIMAL</span></span>
          <span className="hover:text-sg-green transition-colors cursor-default">NODE: <span className="text-sg-green">ACTIVE-09</span></span>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-20 pb-32 max-w-7xl mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 border border-sg-green/30 bg-sg-green/5 text-sg-green text-[10px] font-bold tracking-[0.2em] animate-pulse">
            <Activity size={12} /> ENCRYPTED SECURE CONNECTION ESTABLISHED
          </div>
          
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.9] uppercase bg-gradient-to-b from-white to-sg-muted bg-clip-text text-transparent">
            AI-POWERED <br />
            <span className="text-sg-green">INTRUSION</span> DETECTOR
          </h1>

          <p className="max-w-2xl text-sg-muted text-sm md:text-lg mb-12 font-mono leading-relaxed mx-auto border-t border-b border-sg-border/10 py-6">
            Next-generation surveillance framework utilizing computer vision and real-time deep learning to identify and neutralize perimeter breaches with unmatched precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              to="/login"
              className="group relative px-10 py-5 bg-sg-green text-black font-bold uppercase tracking-[0.2em] text-sm overflow-hidden transition-all hover:pr-14 active:scale-95"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              ACCESS TERMINAL
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 transition-all group-hover:right-6" size={20} />
            </Link>
            
            <Link 
               to="/login"
               className="px-10 py-5 border border-sg-border hover:border-sg-green bg-sg-panel/50 text-white font-bold uppercase tracking-[0.3em] text-sm transition-all hover:bg-sg-green/5 active:scale-95"
            >
              WHITELIST_REGISTRY
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40 w-full animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-300">
          <FeatureCard 
            icon={<Eye className="text-sg-green" size={24} />}
            title="VISUAL INTELLIGENCE"
            desc="Advanced neural networks processing synchronized multi-camera video streams at the edge."
          />
          <FeatureCard 
            icon={<Lock className="text-sg-green" size={24} />}
            title="AUTHORIZED_SYNC"
            desc="Live cross-referencing with whitelisted personnel and vehicle registry via encrypted Google Cloud API."
          />
          <FeatureCard 
            icon={<Zap className="text-sg-green" size={24} />}
            title="LOW-LATENCY_FEED"
            desc="Optimized MediaRecorder pipeline delivering 5s analysis chunks with zero loss packets."
          />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          from { transform: translateY(-100%); }
          to { transform: translateY(2000%); }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
      `}} />
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="sg-card group relative overflow-hidden text-left border-sg-border/30 bg-sg-panel/10 p-8 hover:border-sg-green/50 transition-all duration-500">
      <div className="absolute top-0 left-0 w-[1px] h-0 bg-sg-green transition-all duration-700 group-hover:h-full"></div>
      <div className="mb-6 p-3 bg-sg-black w-fit border border-sg-border/30 group-hover:border-sg-green transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold tracking-[0.1em] mb-4 text-white uppercase group-hover:text-sg-green transition-colors">{title}</h3>
      <p className="text-sg-muted text-xs leading-loose font-mono transition-colors group-hover:text-white/80">
        {desc}
      </p>
      <div className="mt-8 flex items-center gap-2 text-[9px] font-bold text-sg-green opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
        READ_DOCUMENTATION <ChevronRight size={10} />
      </div>
    </div>
  );
}

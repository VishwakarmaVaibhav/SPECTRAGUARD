import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <div className="min-h-screen bg-sg-black text-white font-sans selection:bg-sg-green selection:text-black overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,65,0.1),transparent_70%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Hero Header */}
      <header className="relative z-20 container mx-auto px-6 py-8 flex items-center justify-between border-b border-sg-border/30">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-sg-green shadow-[0_0_10px_rgba(0,255,65,0.5)]"></div>
          <span className="font-mono text-xl font-bold tracking-widest uppercase">
            SPECTRA<span className="text-sg-green font-black">GUARD</span>
          </span>
        </div>
        <Link 
          to="/login" 
          className="sg-btn-primary px-6 py-2 text-xs"
        >
          ACCESS TERMINAL
        </Link>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 container mx-auto px-6 py-24 md:py-32 flex flex-col items-center">
        {/* Scanning Line Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-sg-green/30 to-transparent animate-pulse"></div>

        <div className="text-center mb-16 relative">
          <div className="inline-block px-3 py-1 bg-sg-green/10 border border-sg-green/30 text-sg-green text-[10px] font-mono tracking-[0.3em] mb-6 animate-in slide-in-from-top duration-700">
            SYSTEM STATUS: OPERATIONAL_V1.0
          </div>
          <h1 className="text-5xl md:text-8xl font-mono font-bold tracking-tighter mb-6 leading-none animate-in fade-in slide-in-from-bottom duration-1000">
            ADVANCED FOREST <br />
            <span className="text-sg-green text-transparent bg-clip-text bg-gradient-to-r from-sg-green via-sg-green to-sg-green/10">SURVEILLANCE</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sg-muted text-sm md:text-lg font-mono leading-relaxed opacity-80">
            Utilizing next-generation YOLO neural networks for real-time intrusion detection, 
            wildlife preservation, and automated field unit logistics.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mb-24">
          <PillarCard 
            icon="◩"
            title="NEURAL ANALYSIS"
            desc="Sub-second object classification for humans, vehicles, and wildlife using industry-leading ML models."
          />
          <PillarCard 
            icon="▶"
            title="FIELD LOGISTICS"
            desc="Direct multi-media ingestion for rangers with encrypted real-time alert synchronisation."
          />
          <PillarCard 
            icon="■"
            title="COMMAND CENTER"
            desc="Locked-down administrative oversight with exhaustive historical evidence archival and personnel tracking."
          />
        </div>

        {/* Final CTA */}
        <div className="text-center group">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-4 bg-sg-green text-black font-mono font-black px-12 py-5 text-lg hover:bg-white transition-all duration-300 relative"
          >
            <span>ESTABLISH SECURE CONNECTION</span>
            <span className="text-2xl animate-bounce-x">→</span>
            
            {/* Button Glitch Effect Placeholder */}
            <div className="absolute -inset-1 border border-sg-green/30 scale-105 group-hover:scale-110 transition-transform duration-300"></div>
          </Link>
          <div className="mt-6 font-mono text-[9px] text-sg-muted tracking-widest uppercase opacity-50">
            Requires Class-4 Administrative Clearance or Field Identification
          </div>
        </div>
      </main>

      {/* Decorative Grid SVG */}
      <div className="fixed bottom-0 left-0 w-full h-[300px] pointer-events-none overflow-hidden opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#00ff41" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" transform="perspective(500px) rotateX(60deg) translateY(100px)" />
        </svg>
      </div>
    </div>
  );
}

function PillarCard({ icon, title, desc }) {
  return (
    <div className="sg-card p-8 border-sg-border/20 group hover:border-sg-green/50 transition-all duration-300 flex flex-col items-center text-center">
      <div className="text-3xl text-sg-green mb-6 group-hover:scale-125 transition-transform duration-300">{icon}</div>
      <h3 className="font-mono text-lg font-bold tracking-widest mb-4">{title}</h3>
      <p className="font-mono text-xs text-sg-muted leading-relaxed uppercase">{desc}</p>
    </div>
  );
}

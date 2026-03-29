import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-sg-panel border-t border-sg-border py-4 px-6 shrink-0 relative z-20 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 opacity-50">
          <span className="font-mono text-xs text-sg-text tracking-widest">
            SPECTRA<span className="text-sg-green">GUARD</span> © {new Date().getFullYear()}
          </span>
        </div>
        
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
          <Link to="/docs" className="font-mono text-[10px] md:text-xs text-sg-muted hover:text-sg-green transition-colors">
            SYSTEM DOCUMENTATION
          </Link>
          <Link to="/terms" className="font-mono text-[10px] md:text-xs text-sg-muted hover:text-sg-green transition-colors">
            TERMS & CONDITIONS
          </Link>
          <Link to="/privacy" className="font-mono text-[10px] md:text-xs text-sg-muted hover:text-sg-green transition-colors">
            PRIVACY POLICY
          </Link>
          <a href="#" className="font-mono text-[10px] md:text-xs text-sg-muted hover:text-sg-green transition-colors flex items-center gap-1">
            PUBLISHED RESEARCH <span className="text-[8px]">↗</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}

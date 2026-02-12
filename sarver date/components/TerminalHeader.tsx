
import React from 'react';
import { Menu, BrainCircuit, Activity, Zap, Brain, Database, HardDrive, Globe } from 'lucide-react';

interface TerminalHeaderProps {
  isConnected: boolean;
  toggleSidebar: () => void;
  isThinkerMode: boolean;
  toggleThinkerMode: () => void;
  isFasterMode: boolean;
  toggleFasterMode: () => void;
  isGhostMode: boolean;
  toggleGhostMode: () => void;
}

const TerminalHeader: React.FC<TerminalHeaderProps> = ({ 
  isConnected, 
  toggleSidebar, 
  isThinkerMode,
  toggleThinkerMode,
  isFasterMode,
  toggleFasterMode,
  isGhostMode,
  toggleGhostMode
}) => {
  return (
    <header className="flex-none h-16 border-b border-white/5 bg-[#0b0c0f]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 right-0 md:sticky z-30 transition-all duration-300">
      <div className="flex items-center gap-3 sm:gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-white bg-white/10 hover:bg-white/20 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-xl md:hidden transition-all active:scale-95"
        >
          <Menu size={22} />
        </button>
        
        <div className="flex items-center gap-3 select-none">
          <div className="relative">
            <div className={`absolute inset-0 bg-red-600 blur-lg opacity-20 logo-glow rounded-full`}></div>
            <BrainCircuit className="w-6 h-6 text-red-600 relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-100 tracking-wide logo-glow">DARK AI</span>
            <span className="text-[10px] text-gray-500 font-mono tracking-wider hidden sm:block">UNRESTRICTED // V2.6 // MANUAL-CTRL</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Ghost Protocol Toggle */}
        <button
          onClick={toggleGhostMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            isGhostMode 
              ? "bg-emerald-900/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]" 
              : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
          }`}
          title="Ghost Protocol (Web Access)"
        >
          <Globe size={14} className={isGhostMode ? "fill-emerald-400/20" : ""} />
          <span className="text-xs font-bold tracking-wider hidden sm:inline">
            SEARCH
          </span>
        </button>

        {/* Faster Mode Toggle */}
        <button
          onClick={toggleFasterMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            isFasterMode 
              ? "bg-cyan-900/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]" 
              : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
          }`}
          title="Dark AI Fast"
        >
          <Zap size={14} className={isFasterMode ? "fill-cyan-400" : ""} />
          <span className="text-xs font-bold tracking-wider hidden sm:inline">
            FASTER
          </span>
          <span className="text-xs font-bold tracking-wider inline sm:hidden">
            FAST
          </span>
        </button>

        {/* Thinker Mode Toggle */}
        <button
          onClick={toggleThinkerMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            isThinkerMode 
              ? "bg-purple-900/20 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
              : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
          }`}
          title="Dark AI Pro"
        >
          <Brain size={14} className={isThinkerMode ? "fill-purple-400" : ""} />
          <span className="text-xs font-bold tracking-wider hidden sm:inline">
            THINKER
          </span>
          <span className="text-xs font-bold tracking-wider inline sm:hidden">
            PRO
          </span>
        </button>
      </div>
    </header>
  );
};

export default TerminalHeader;

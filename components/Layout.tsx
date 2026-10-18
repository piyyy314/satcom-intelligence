
import * as React from 'react';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  isStealthMode: boolean;
  setIsStealthMode: (val: boolean) => void;
  isDarkLinkActive?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, isStealthMode, setIsStealthMode, isDarkLinkActive }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    setInstallPrompt(null);
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-cyan-500/30 transition-colors duration-1000 ${isStealthMode ? 'stealth-active' : ''}`}>
      <header className={`border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-[60] transition-all duration-1000 ${isStealthMode ? 'bg-purple-950/20 border-purple-900/40 shadow-[0_4px_30px_rgba(168,85,247,0.1)]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-5 group cursor-pointer">
            <div className={`w-12 h-12 bg-slate-900 border rounded-2xl flex items-center justify-center shadow-lg transition-all duration-700 ${isStealthMode ? 'border-purple-500 shadow-purple-500/20 bg-purple-950/40' : 'border-cyan-500/30 shadow-cyan-500/10 group-hover:border-cyan-500'}`}>
              <svg className={`w-7 h-7 transition-colors duration-700 ${isStealthMode ? 'text-purple-400' : 'text-cyan-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase">SatExpert <span className={isStealthMode ? 'text-purple-400' : 'text-cyan-400'}>TSI_CORE</span></h1>
              <div className="flex items-center space-x-2 mt-0.5">
                 <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-sm ${isDarkLinkActive ? 'bg-red-500 shadow-red-500/50' : (isStealthMode ? 'bg-purple-500' : 'bg-green-500')}`}></div>
                 <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-black">
                   Link: {isDarkLinkActive ? 'OFF-GRID / MESH ACTIVE' : (isStealthMode ? 'Ghost_Encrypted' : 'Operational')}
                 </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Stealth Mode Toggle */}
            <div className="flex items-center space-x-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 transition-colors ${isStealthMode ? 'text-purple-400' : 'text-slate-600'}`}>Ghost_Proto</span>
              <button 
                onClick={() => setIsStealthMode(!isStealthMode)}
                className={`relative w-11 h-6 rounded-full transition-all duration-500 ${isStealthMode ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-500 transform ${isStealthMode ? 'translate-x-5' : 'translate-x-0'} shadow-md`}></div>
              </button>
            </div>

            {installPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-cyan-400 px-4 py-2 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all uppercase tracking-widest"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>Deploy</span>
              </button>
            )}

            {isStealthMode && (
              <div className="flex items-center space-x-3 bg-purple-500/20 border border-purple-400 px-5 py-2.5 rounded-2xl shadow-[0_0_25px_rgba(168,85,247,0.3)] animate-pulse-stealth">
                <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-purple-100 uppercase tracking-[0.2em] leading-none">Ghost_Protocol</span>
                  <span className="text-[7px] font-bold text-purple-400 uppercase tracking-widest mt-0.5">Active_Masking</span>
                </div>
              </div>
            )}

            <div className="hidden lg:flex flex-col items-end border-l border-slate-800 pl-6">
               <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Auth_Level</span>
               <span className={`text-[10px] mono font-black ${isStealthMode ? 'text-purple-400' : 'text-cyan-500'}`}>S-TIER_OPERATOR</span>
            </div>
            
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-400 mono font-bold shadow-inner">v5.1.0</span>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto w-full p-6 md:p-8 relative">
        {children}
      </main>
      
      {/* Tactical Comms Ticker */}
      <div className={`border-t h-10 flex items-center overflow-hidden whitespace-nowrap z-[70] sticky bottom-0 transition-colors duration-1000 ${isStealthMode ? 'bg-black border-purple-900/50' : 'bg-slate-950 border-slate-800/50'}`}>
        <div className={`flex items-center px-6 h-full border-r text-[9px] font-black uppercase tracking-widest shrink-0 transition-colors duration-1000 ${isStealthMode ? 'bg-purple-950/20 text-purple-400 border-purple-900/50' : 'bg-cyan-500/10 text-cyan-500 border-slate-800/50'}`}>
          {isStealthMode ? 'Ghost_Stream' : 'Mission_Stream'}
        </div>
        <div className="flex animate-marquee space-x-12 items-center">
          {[1,2,3].map(i => (
            <div key={i} className="flex space-x-12">
              <span className={`text-[10px] mono uppercase ${isStealthMode ? 'text-purple-900' : 'text-slate-500'}`}>{isStealthMode ? 'SIG_SUPPRESSION: ACTIVE' : 'SAT_LOCK: ESTABLISHED'}</span>
              <span className="text-[10px] mono text-slate-800 uppercase">|</span>
              <span className={`text-[10px] mono uppercase ${isStealthMode ? 'text-purple-900' : 'text-slate-500'}`}>{isStealthMode ? 'GEOLOC_MUD: ENABLED' : `GPS_FIX: ${new Date().toLocaleTimeString()}`}</span>
              <span className="text-[10px] mono text-slate-800 uppercase">|</span>
              <span className={`text-[10px] mono uppercase ${isStealthMode ? 'text-purple-900' : 'text-slate-500'}`}>COMMS_CHANNEL: ENCRYPTED_GHOST_PARITY</span>
              <span className="text-[10px] mono text-slate-800 uppercase">|</span>
              <span className={`text-[10px] mono uppercase ${isStealthMode ? 'text-purple-700/50' : 'text-amber-500'}`}>INTEL: {isStealthMode ? 'PASSIVE_RECON_ONLY' : 'MONITORING_LOCAL_INTERFERENCE'}</span>
              <span className="text-[10px] mono text-slate-800 uppercase">|</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-slate-800/30 py-10 px-6 text-center bg-slate-950/20">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] mb-4">Tactical SatCom Intelligence Engine // © 2025 SatExpert Global</p>
          <div className="flex justify-center space-x-4">
             <div className="w-2 h-0.5 bg-slate-800"></div>
             <div className={`w-2 h-0.5 transition-colors duration-700 ${isStealthMode ? 'bg-purple-500' : 'bg-cyan-500'}`}></div>
             <div className="w-2 h-0.5 bg-slate-800"></div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes pulse-stealth {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50% { opacity: 0.7; filter: brightness(1.3); }
        }
        .animate-pulse-stealth {
          animation: pulse-stealth 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

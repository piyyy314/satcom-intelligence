
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Coordinates, Satellite, SatelliteStatus, WeatherCondition } from '../types.ts';
import { fetchSatelliteStatusUpdates } from '../services/satelliteService.ts';

interface TacticalEvent {
  id: string;
  timestamp: string;
  satName: string;
  satId: string;
  status: SatelliteStatus | 'CRITICAL' | 'BREACH';
  detail: string;
}

interface Props {
  loc: Coordinates;
  sat: Satellite;
  satellites: Satellite[];
  onLocChange: (loc: Coordinates) => void;
  onSatChange: (sat: Satellite) => void;
  onSatellitesUpdate: (sats: Satellite[]) => void;
  isTracking?: boolean;
  onTrackingChange?: (val: boolean) => void;
  isJamming: boolean;
  setIsJamming: (val: boolean) => void;
  jammingPower: number;
  setJammingPower: (val: number) => void;
  weather: WeatherCondition;
  setWeather: (val: WeatherCondition) => void;
  isStealthMode: boolean;
  telemetry: any;
  eventLogs: TacticalEvent[];
  setEventLogs: React.Dispatch<React.SetStateAction<TacticalEvent[]>>;
  hasNewLogs: boolean;
  setHasNewLogs: (val: boolean) => void;
}

const StatusBadge: React.FC<{ status?: SatelliteStatus | string }> = ({ status }) => {
  const config = {
    active: { color: 'bg-green-500', label: 'ONLINE', pulse: true },
    offline: { color: 'bg-red-500', label: 'OFFLINE', pulse: false },
    maintenance: { color: 'bg-amber-500', label: 'MAINT', pulse: true },
    decommissioned: { color: 'bg-slate-600', label: 'EOL', pulse: false },
    CRITICAL: { color: 'bg-red-600', label: 'ALERT', pulse: true },
    BREACH: { color: 'bg-red-800', label: 'BREACH', pulse: true },
  }[status || 'active'] || { color: 'bg-slate-500', label: 'UNKNOWN', pulse: false };

  return (
    <div className="flex items-center space-x-1.5">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'status-pulse' : ''}`}></div>
      <span className={`text-[9px] font-bold tracking-widest ${(config.color || '').replace('bg-', 'text-')}`}>
        {config.label}
      </span>
    </div>
  );
};

export const TacticalHUD: React.FC<Props> = ({ 
  loc, sat, satellites, onLocChange, onSatChange, onSatellitesUpdate, isTracking, onTrackingChange,
  isJamming, setIsJamming, jammingPower, setJammingPower,
  weather, setWeather, isStealthMode, telemetry,
  eventLogs, setEventLogs, hasNewLogs, setHasNewLogs
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [animateLabel, setAnimateLabel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevSatRef = useRef<{id: string, status?: SatelliteStatus} | null>(null);

  const filteredSatellites = useMemo(() => {
    return satellites.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.orbitalSlot.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, satellites]);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const updatedSatellites = await fetchSatelliteStatusUpdates();
      onSatellitesUpdate(updatedSatellites);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [onSatellitesUpdate]);

  useEffect(() => {
    setAnimateLabel(true);
    const timer = setTimeout(() => setAnimateLabel(false), 600);

    if (prevSatRef.current === null) {
      prevSatRef.current = { id: sat.id, status: sat.status };
      return;
    }

    const isSameSat = prevSatRef.current?.id === sat.id;
    const isStatusChanged = prevSatRef.current?.status !== sat.status;

    if (!isSameSat || (isSameSat && isStatusChanged)) {
      const newEvent: TacticalEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
        satName: sat.name,
        satId: sat.id,
        status: sat.status || 'active',
        detail: !isSameSat 
          ? `ASSET_ACQUISITION: Targeted ${sat.name} (${sat.orbitalSlot})`
          : `STATUS_CHANGE: Asset ${sat.name} transitioned to ${sat.status?.toUpperCase()}`
      };
      setEventLogs(prev => [newEvent, ...prev].slice(0, 50));
      if (!showEventLog) setHasNewLogs(true);
    }

    prevSatRef.current = { id: sat.id, status: sat.status };
    return () => clearTimeout(timer);
  }, [sat.id, sat.status, showEventLog, setEventLogs, setHasNewLogs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (s: Satellite) => {
    onSatChange(s);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleAcknowledge = () => {
    setIsAcknowledging(true);
    setTimeout(() => {
      setShowEventLog(false);
      setIsAcknowledging(false);
    }, 800);
  };

  const handleExport = () => {
    setIsExporting(true);
    
    // Ensure we take only the latest 10 logs relevant to THIS satellite
    const relevantLogs = eventLogs
      .filter(log => log.satId === sat.id)
      .slice(0, 10);

    const exportData = {
      mission_timestamp: new Date().toISOString(),
      mission_context: {
        stealth_mode_active: isStealthMode,
        electronic_warfare: {
          jamming_active: isJamming,
          jamming_intensity: `${jammingPower}%`,
          protocol: "Continuous Wave Overlay"
        },
        environment: {
          weather_condition: weather,
          rain_fade_estimate: weather === 'CLEAR' ? '0.5dB' : weather === 'OVERCAST' ? '2.0dB' : '8.0dB+'
        }
      },
      asset_specifications: {
        id: sat.id,
        name: sat.name,
        orbital_slot: sat.orbitalSlot,
        operator: sat.operator,
        current_status: sat.status
      },
      live_telemetry: {
        snr_margin: `${telemetry.snr} dB`,
        rx_power: `${telemetry.rxPower} dBm`,
        buc_temp: `${telemetry.bucTemp} °C`,
        packet_loss_rate: `${telemetry.packetLoss}%`,
        link_state: telemetry.status
      },
      ground_station: {
        coordinates: loc,
        datum: "WGS84"
      },
      tactical_event_log: relevantLogs
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TSI_MISSION_BRIEF_${(sat.name || 'ASSET').replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setTimeout(() => setIsExporting(false), 2000);
  };

  const handleDownloadLogHistory = () => {
    if (eventLogs.length === 0) return;
    const data = `--- TSI MISSION SITUATION LOG ---\n` +
      `TIMESTAMP: ${new Date().toLocaleString()}\n` +
      `TERMINAL: TSI-449\n` +
      `ASSET: ${sat.name} (${sat.orbitalSlot})\n` +
      `---------------------------------\n\n` +
      `=== EVENTS ===\n` +
      eventLogs.map(log => `[${log.timestamp}] [${log.status.toUpperCase()}] ${log.detail}`).join('\n') +
      `\n\n[EOF]`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TSI_SITUATION_LOG_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const weatherIcons = {
    CLEAR: '☀️',
    OVERCAST: '☁️',
    LIGHT_RAIN: '🌧️',
    HEAVY_STORM: '⛈️'
  };

  return (
    <div className="glass rounded-2xl p-6 border-slate-800 relative z-50 overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/20"></div>
      
      <div className="space-y-6">
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex flex-col">
              <label className={`block text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 transform ${
                animateLabel 
                  ? 'text-cyan-400 scale-105' 
                  : 'text-white'
              }`}>
                Target Acquisition
              </label>
              <div className="card-header-line"></div>
            </div>
            
            <button 
              onClick={() => { setShowEventLog(true); setHasNewLogs(false); }}
              className={`group flex items-center space-x-2.5 px-6 py-3 rounded-2xl border-2 transition-all duration-300 uppercase tracking-[0.15em] text-[10px] font-black ${
                hasNewLogs 
                  ? 'bg-cyan-500 border-white text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.7)] btn-scanline' 
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/60 shadow-lg'
              }`}
            >
              <div className="relative flex items-center justify-center">
                 <svg className={`w-4 h-4 transition-transform ${hasNewLogs ? 'animate-bounce' : 'group-hover:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 {hasNewLogs && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-ping"></div>}
              </div>
              <span>SITUATION_LOG</span>
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder={isOpen ? "ENTER SATELLITE NAME OR SLOT..." : sat.name}
              className={`w-full bg-slate-950/80 border-2 ${isOpen ? 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-800'} rounded-xl p-3.5 pl-10 text-xs text-white outline-none transition-all mono placeholder:text-slate-700`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <svg className={`w-4.5 h-4.5 ${isOpen ? 'text-cyan-400' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
               {!isOpen && <StatusBadge status={sat.status} />}
            </div>
          </div>

          {isOpen && (
            <div className="absolute mt-2 w-full glass bg-slate-950 border-2 border-cyan-500 rounded-xl shadow-2xl overflow-hidden max-h-[300px] flex flex-col z-[100] animate-in slide-in-from-top-2">
              <div className="bg-cyan-500/10 px-4 py-2 border-b border-slate-800">
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Asset Registry Access</span>
              </div>
              <div className="overflow-y-auto py-1 scrollbar-hide">
                {filteredSatellites.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between border-b border-slate-900/50 last:border-none ${s.id === sat.id ? 'bg-cyan-500/5' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold ${s.id === sat.id ? 'text-cyan-400' : 'text-slate-200'}`}>{s.name}</span>
                      <span className="text-[9px] text-slate-500 mono">{s.operator}</span>
                    </div>
                    <span className="text-[10px] text-cyan-500 font-mono font-bold">{s.orbitalSlot}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-3 flex flex-col">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Authority</span>
            <span className="text-[10px] font-bold text-slate-200 mono truncate">{sat.operator || 'UNSPECIFIED'}</span>
          </div>
          <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-3 flex flex-col items-end text-right">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Slot Index</span>
            <span className="text-[10px] font-bold text-cyan-400 mono">{sat.orbitalSlot}</span>
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
             <span className="text-[9px] font-black text-white uppercase tracking-widest">Atmospheric Environment</span>
             <span className="text-[8px] text-slate-500 font-bold uppercase mono">Ka-Band Simulation</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['CLEAR', 'OVERCAST', 'LIGHT_RAIN', 'HEAVY_STORM'] as WeatherCondition[]).map((cond) => (
              <button 
                key={cond}
                onClick={() => setWeather(cond)}
                disabled={isStealthMode}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
                  isStealthMode ? 'opacity-30' : ''
                } ${
                  weather === cond 
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                    : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-600'
                }`}
              >
                <span className="text-lg mb-1">{weatherIcons[cond]}</span>
                <span className="text-[7px] font-bold uppercase tracking-tighter text-center">{(cond || '').replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-4 space-y-4 transition-all duration-500 ${isStealthMode ? 'bg-purple-900/10 border-purple-500/30' : (isJamming ? 'bg-red-900/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'bg-slate-950/40 border-slate-800')}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isStealthMode ? 'text-purple-400' : (isJamming ? 'text-red-500' : 'text-white')}`}>Electronic Warfare</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase mono">Mode: Continuous Wave</span>
            </div>
            <button 
              onClick={() => setIsJamming(!isJamming)}
              disabled={isStealthMode}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                isStealthMode ? 'bg-slate-800 text-slate-500' : (isJamming ? 'bg-red-600 text-white shadow-lg animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white')
              }`}
            >
              {isStealthMode ? 'Stealth' : (isJamming ? 'Engaged' : 'Standby')}
            </button>
          </div>
        </div>
        
        <div className="pt-2">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className={`w-full flex items-center justify-center space-x-3 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${isExporting ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-cyan-600/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-xl shadow-cyan-500/10'}`}
          >
            <div className={`relative ${isExporting ? 'animate-spin' : ''}`}>
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{isExporting ? 'UPLINK_IN_PROGRESS...' : 'DOWNLOAD TACTICAL BRIEF'}</span>
          </button>
        </div>
      </div>

      {showEventLog && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-500"
          onClick={() => !isAcknowledging && setShowEventLog(false)}
        >
          <div 
            className="glass w-full max-w-lg rounded-[2.5rem] border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden scale-100 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent"></div>
               <div>
                  <h3 className="text-base font-black text-white uppercase tracking-[0.2em] flex items-center">
                    <span className="w-3 h-3 bg-cyan-500 rounded-full mr-4 shadow-[0_0_15px_rgba(34,211,238,0.6)]"></span>
                    Mission Situation Log
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">Terminal-ID: TSI-449 // Secure Node Access</p>
               </div>
               
               <div className="flex items-center space-x-2">
                   {eventLogs.length > 0 && (
                       <button 
                           onClick={handleDownloadLogHistory}
                           className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest shadow-md"
                       >
                           EXPORT_LOGS
                       </button>
                   )}
                   <button 
                     onClick={() => setShowEventLog(false)}
                     className="flex items-center space-x-2 px-4 py-2 bg-slate-800/80 hover:bg-red-500/30 border border-slate-700 hover:border-red-500/60 rounded-xl transition-all group"
                   >
                     <span className="text-[9px] font-black text-slate-500 group-hover:text-red-500 tracking-[0.2em]">DISMISS</span>
                     <svg className="w-5 h-5 text-slate-500 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
               </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-950/40 scrollbar-hide">
              {eventLogs.length > 0 ? (
                eventLogs.map((log) => (
                  <div key={log.id} className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-start space-x-5 group hover:border-cyan-500/40 transition-all">
                    <div className="pt-1.5"><StatusBadge status={log.status} /></div>
                    <div className="flex-grow">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black text-white mono tracking-widest uppercase">{log.satName}</span>
                          <span className="text-[9px] text-slate-600 font-bold mono">{log.timestamp}</span>
                       </div>
                       <p className={`text-[13px] leading-relaxed mono ${log.status === 'CRITICAL' || log.status === 'BREACH' ? 'text-red-400 font-bold' : 'text-slate-400'}`}>{log.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                   <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em]">No Situational Intel On File</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex flex-col space-y-4">
               {isAcknowledging && (
                 <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 animate-progress-fill"></div>
                 </div>
               )}
               <div className="flex justify-end">
                  <button 
                    onClick={handleAcknowledge} 
                    disabled={isAcknowledging}
                    className={`min-w-[180px] py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all active:scale-95 shadow-2xl ${
                      isAcknowledging 
                        ? 'bg-slate-800 text-cyan-500 border-2 border-cyan-500/40' 
                        : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-cyan-500/30'
                    }`}
                  >
                    {isAcknowledging ? 'SYNCHRONIZING...' : 'Acknowledge SITREP'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-fill {
          animation: progress-fill 0.8s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

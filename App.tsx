
import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout.tsx';
import { LookAngleCard } from './components/LookAngleCard.tsx';
import { AITechnician } from './components/AITechnician.tsx';
import { SecurityTools } from './components/SecurityTools.tsx';
import { LinkBudgetCalculator } from './components/LinkBudgetCalculator.tsx';
import { SignalVisualizer } from './components/SignalVisualizer.tsx';
import { TacticalHUD } from './components/TacticalHUD.tsx';
import { TacticalMap } from './components/TacticalMap.tsx';
import { RSSReader } from './components/RSSReader.tsx';
import { TelemetryPulse } from './components/TelemetryPulse.tsx';
import { SignalInterceptor } from './components/SignalInterceptor.tsx';
import { MediaForge } from './components/MediaForge.tsx';
import { LiveComms } from './components/LiveComms.tsx';
import { TerrainObstruction } from './components/TerrainObstruction.tsx';
import { DarkLink } from './components/DarkLink.tsx';
import { SatelliteLookup } from './components/SatelliteLookup.tsx';
import { Coordinates, Satellite, LookAngles, WeatherCondition, MainView, SatelliteStatus } from './types.ts';
import { COMMON_SATELLITES } from './constants.ts';
import { calculateLookAngles } from './utils/geoUtils.ts';
import { IndexedDbService, ApplicationState } from './services/indexedDbService.ts';

const STORAGE_KEY = 'satexpert_tactical_v5';
const STEALTH_STORAGE_KEY = 'satexpert_stealth_mode';
const EVENT_LOG_STORAGE_KEY = 'satexpert_event_logs';

interface TacticalEvent {
  id: string;
  timestamp: string;
  satName: string;
  satId: string;
  status: SatelliteStatus | 'CRITICAL' | 'BREACH';
  detail: string;
}

export const App: React.FC = () => {
  const [satellites, setSatellites] = useState<Satellite[]>(COMMON_SATELLITES);
  const [userLoc, setUserLoc] = useState<Coordinates>({ lat: 51.5074, lng: -0.1278 });
  const [selectedSat, setSelectedSat] = useState<Satellite>(satellites[0]);
  const [lookAngles, setLookAngles] = useState<LookAngles | null>(null);
  const [view, setView] = useState<MainView>('tactical');
  const [defcon, setDefcon] = useState<number>(5);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherCondition>('CLEAR');
  const [isJamming, setIsJamming] = useState<boolean>(false);
  const [jammingPower, setJammingPower] = useState<number>(50);
  const [isStealthMode, setIsStealthMode] = useState<boolean>(false);
  const [isNeuralCleaning, setIsNeuralCleaning] = useState(false);
  const [isDarkLinkActive, setIsDarkLinkActive] = useState(false);
  
  // Global Event Log State
  const [eventLogs, setEventLogs] = useState<TacticalEvent[]>([]);
  const [hasNewLogs, setHasNewLogs] = useState(false);

  // Disaster Recovery States
  const [recoveryCheckpoint, setRecoveryCheckpoint] = useState<ApplicationState | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);

  const isFirstMount = useRef(true);

  const addMissionLog = useCallback((detail: string, status: TacticalEvent['status'] = 'active') => {
    const newEvent: TacticalEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      satName: selectedSat.name,
      satId: selectedSat.id,
      status: status,
      detail: detail
    };
    setEventLogs(prev => [newEvent, ...prev].slice(0, 50));
    setHasNewLogs(true);
  }, [selectedSat]);

  // Source of Truth Telemetry logic
  const telemetry = useMemo(() => {
    let snr = 16.0;
    let rxPower = -42.0;
    let packetLoss = 0.00;
    let bucTemp = 45.0;

    if (weather === 'OVERCAST') { snr -= 2.0; rxPower -= 1.5; }
    else if (weather === 'LIGHT_RAIN') { snr -= 5.0; rxPower -= 3.5; packetLoss += 0.8; }
    else if (weather === 'HEAVY_STORM') { snr -= 14.0; rxPower -= 12.0; packetLoss += 12.5; }

    if (isJamming) {
      snr -= (jammingPower / 5); 
      packetLoss += (jammingPower / 2);
      rxPower += (jammingPower / 10);
      bucTemp += (jammingPower / 15);
    }

    if (isNeuralCleaning) {
      snr += 4.5;
      packetLoss *= 0.2;
    }
    
    if (defcon <= 2) bucTemp += 8.0;

    if (isStealthMode) {
      snr = 20.0; rxPower = -30.0; packetLoss = 0.00; bucTemp = 35.0;
    }

    return {
      snr: Math.max(0, snr + (Math.random() - 0.5)).toFixed(2),
      rxPower: (rxPower + (Math.random() - 0.5)).toFixed(1),
      bucTemp: (bucTemp + (Math.random() - 0.5)).toFixed(1),
      packetLoss: Math.min(100, packetLoss + (Math.random() * 0.2)).toFixed(2),
      status: snr > 10 ? "NOMINAL" : (snr > 4 ? "DEGRADED" : "CRITICAL")
    };
  }, [weather, isJamming, jammingPower, defcon, isStealthMode, isNeuralCleaning]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.loc) setUserLoc(parsed.loc);
      if (parsed.satId) {
        const sat = satellites.find(s => s.id === parsed.satId);
        if (sat) setSelectedSat(sat);
      }
      setDefcon(parsed.defcon || 5);
    }
    const savedStealth = localStorage.getItem(STEALTH_STORAGE_KEY);
    if (savedStealth !== null) setIsStealthMode(JSON.parse(savedStealth));

    const savedLogs = localStorage.getItem(EVENT_LOG_STORAGE_KEY);
    if (savedLogs) setEventLogs(JSON.parse(savedLogs));

    isFirstMount.current = false;

    // Check if there is an IndexedDB disaster recovery checkpoint on startup
    const checkRecovery = async () => {
      try {
        const dbState = await IndexedDbService.loadState();
        if (dbState) {
          setRecoveryCheckpoint(dbState);
        }
      } catch (err) {
        console.error("IndexedDB startup load error:", err);
      }
    };
    checkRecovery();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ loc: userLoc, satId: selectedSat.id, defcon }));
  }, [userLoc, selectedSat, defcon]);

  useEffect(() => {
    if (!isFirstMount.current) localStorage.setItem(STEALTH_STORAGE_KEY, JSON.stringify(isStealthMode));
  }, [isStealthMode]);

  useEffect(() => {
    localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(eventLogs));
  }, [eventLogs]);

  useEffect(() => {
    setLookAngles(calculateLookAngles(userLoc, selectedSat.longitude));
  }, [userLoc, selectedSat]);

  // DISASTER RECOVERY AUTO-SAVE SYSTEM (IndexedDB)
  // Store a fresh copy of state variables inside stateRef on every change to prevent closures
  const stateRef = useRef({
    satellites,
    userLoc,
    selectedSatId: selectedSat.id,
    view,
    defcon,
    isTracking,
    weather,
    isJamming,
    jammingPower,
    isStealthMode,
    isNeuralCleaning,
    isDarkLinkActive,
    eventLogs
  });

  useEffect(() => {
    stateRef.current = {
      satellites,
      userLoc,
      selectedSatId: selectedSat.id,
      view,
      defcon,
      isTracking,
      weather,
      isJamming,
      jammingPower,
      isStealthMode,
      isNeuralCleaning,
      isDarkLinkActive,
      eventLogs
    };
  }, [
    satellites,
    userLoc,
    selectedSat,
    view,
    defcon,
    isTracking,
    weather,
    isJamming,
    jammingPower,
    isStealthMode,
    isNeuralCleaning,
    isDarkLinkActive,
    eventLogs
  ]);

  useEffect(() => {
    const triggerAutoSave = async () => {
      try {
        const payload: ApplicationState = {
          ...stateRef.current,
          timestamp: new Date().toISOString()
        };
        await IndexedDbService.saveState(payload);
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeString);
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
      } catch (err) {
        console.error("Auto-save disaster recovery error:", err);
      }
    };

    // Auto-save every 30 seconds
    const interval = setInterval(triggerAutoSave, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRestoreState = () => {
    if (!recoveryCheckpoint) return;
    try {
      if (recoveryCheckpoint.satellites) setSatellites(recoveryCheckpoint.satellites);
      if (recoveryCheckpoint.userLoc) setUserLoc(recoveryCheckpoint.userLoc);
      
      const targetSatId = recoveryCheckpoint.selectedSatId;
      if (targetSatId) {
        const foundSat = (recoveryCheckpoint.satellites || satellites).find(s => s.id === targetSatId);
        if (foundSat) setSelectedSat(foundSat);
      }
      
      if (recoveryCheckpoint.view) setView(recoveryCheckpoint.view);
      if (recoveryCheckpoint.defcon !== undefined) setDefcon(recoveryCheckpoint.defcon);
      if (recoveryCheckpoint.isTracking !== undefined) setIsTracking(recoveryCheckpoint.isTracking);
      if (recoveryCheckpoint.weather) setWeather(recoveryCheckpoint.weather);
      if (recoveryCheckpoint.isJamming !== undefined) setIsJamming(recoveryCheckpoint.isJamming);
      if (recoveryCheckpoint.jammingPower !== undefined) setJammingPower(recoveryCheckpoint.jammingPower);
      if (recoveryCheckpoint.isStealthMode !== undefined) setIsStealthMode(recoveryCheckpoint.isStealthMode);
      if (recoveryCheckpoint.isNeuralCleaning !== undefined) setIsNeuralCleaning(recoveryCheckpoint.isNeuralCleaning);
      if (recoveryCheckpoint.isDarkLinkActive !== undefined) setIsDarkLinkActive(recoveryCheckpoint.isDarkLinkActive);
      if (recoveryCheckpoint.eventLogs) setEventLogs(recoveryCheckpoint.eventLogs);

      const formattedTime = new Date(recoveryCheckpoint.timestamp).toLocaleTimeString();
      addMissionLog(`Disaster recovery state restored from backup checkpoint [${formattedTime}]`, 'active');
    } catch (e) {
      console.error("Disaster recovery load error:", e);
    } finally {
      setRecoveryCheckpoint(null);
      IndexedDbService.clearState();
    }
  };

  const handleDismissRecovery = () => {
    setRecoveryCheckpoint(null);
    IndexedDbService.clearState();
  };

  return (
    <div className={`crt-screen min-h-screen ${(!isStealthMode && (isJamming || defcon === 1)) ? 'crt-distorted' : ''}`}>
      <Layout isStealthMode={isStealthMode} setIsStealthMode={setIsStealthMode} isDarkLinkActive={isDarkLinkActive}>
        <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-12 transition-all duration-1000">
          {recoveryCheckpoint && (
            <div className="border border-amber-500/30 bg-amber-950/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Disaster Recovery Checkpoint Found</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    A secure backup from <span className="text-amber-400 font-black">{new Date(recoveryCheckpoint.timestamp).toLocaleString()}</span> is available via IndexedDB.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2.5 w-full md:w-auto shrink-0 justify-end">
                <button 
                  onClick={handleRestoreState}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  Restore State
                </button>
                <button 
                  onClick={handleDismissRecovery}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-800 hover:border-slate-705 active:scale-95 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          <div className={`flex flex-col lg:flex-row items-stretch justify-between gap-4 glass p-4 rounded-2xl border-slate-800 shadow-2xl relative overflow-hidden ${defcon === 1 || isJamming ? 'defcon-alert' : ''}`}>
             <div className="flex flex-col md:flex-row items-center gap-6 z-20">
              <div className="flex flex-col min-w-[320px]">
                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] mb-2 px-1">Mission Control System</span>
                <div className="flex flex-wrap gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/50">
                  {(['tactical', 'intelligence', 'lookup', 'interception', 'media', 'live', 'calculations', 'news', 'darklink'] as MainView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${
                        view === v 
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                          : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5'
                      }`}
                    >
                      {v === 'darklink' ? 'MESH / DARK' : v === 'calculations' ? 'CALCS' : v === 'interception' ? 'SIG_INTEL' : v === 'intelligence' ? 'SENTINEL' : v}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-12 w-px bg-slate-800 hidden md:block"></div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Defcon Protocol</span>
                <div className="flex space-x-1.5 bg-slate-950/40 p-1 rounded-xl border border-slate-800/30">
                  {[5, 4, 3, 2, 1].map(lvl => (
                    <button key={lvl} onClick={() => setDefcon(lvl)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${defcon === lvl ? (lvl <= 2 ? 'bg-red-500 text-white border-red-400' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40') : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-12 w-px bg-slate-800 hidden lg:block"></div>

              <div className="flex flex-col min-w-[150px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Disaster Recovery</span>
                <div className="flex items-center space-x-2 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/30 h-11">
                  <span className={`w-2 h-2 rounded-full ${lastSavedTime ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">DB_UPLINK</span>
                    <span className="text-[8px] font-mono text-slate-500 uppercase leading-none">
                      {lastSavedTime ? `SECURED: ${lastSavedTime}` : "STANDBY"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center lg:justify-end flex-grow z-20">
               <TelemetryPulse telemetry={telemetry} isStealthMode={isStealthMode} />
            </div>
          </div>

          <div className="min-h-[70vh]">
            {view === 'tactical' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                  <TacticalHUD 
                    loc={userLoc} 
                    sat={selectedSat} 
                    satellites={satellites} 
                    onLocChange={setUserLoc} 
                    onSatChange={setSelectedSat} 
                    onSatellitesUpdate={setSatellites} 
                    isTracking={isTracking} 
                    onTrackingChange={setIsTracking} 
                    isJamming={isJamming} 
                    setIsJamming={setIsJamming} 
                    jammingPower={jammingPower} 
                    setJammingPower={setJammingPower} 
                    weather={weather} 
                    setWeather={setWeather} 
                    isStealthMode={isStealthMode}
                    telemetry={telemetry} 
                    eventLogs={eventLogs}
                    setEventLogs={setEventLogs}
                    hasNewLogs={hasNewLogs}
                    setHasNewLogs={setHasNewLogs}
                  />
                  <TacticalMap userLoc={userLoc} satellite={selectedSat} isTracking={isTracking} isStealthMode={isStealthMode} onLocChange={setUserLoc} />
                  {lookAngles && <LookAngleCard angles={lookAngles} satellite={selectedSat} />}
                  <SignalVisualizer quality={lookAngles?.elevation && lookAngles.elevation > 0 ? 85 : 0} isJamming={isJamming} jammingPower={jammingPower} rainFade={weather === 'CLEAR' ? 0.5 : 5.0} isStealthMode={isStealthMode} />
                </div>
                <div className="lg:col-span-7 xl:col-span-8">
                  <AITechnician 
                    context={{ lat: userLoc.lat, lng: userLoc.lng, satName: selectedSat.name, defcon, weather, isJamming }} 
                    telemetry={telemetry} 
                    isStealthMode={isStealthMode}
                    isNeuralCleaning={isNeuralCleaning}
                    onToggleNeuralCleaning={() => setIsNeuralCleaning(!isNeuralCleaning)}
                  />
                </div>
              </div>
            )}

            {view === 'intelligence' && (
              <SecurityTools 
                userLoc={userLoc} 
                selectedSatName={selectedSat.name} 
                isJamming={isJamming} 
                setIsJamming={setIsJamming} 
                jammingPower={jammingPower} 
                setJammingPower={setJammingPower} 
                signalQuality={88} 
                onBack={() => setView('tactical')} 
                isStealthMode={isStealthMode} 
                setIsStealthMode={setIsStealthMode} 
                addMissionLog={addMissionLog}
              />
            )}
            
            {view === 'interception' && (
              <SignalInterceptor isJamming={isJamming} jammingPower={jammingPower} isStealthMode={isStealthMode} />
            )}

            {view === 'media' && <MediaForge />}
            {view === 'live' && <LiveComms isStealthMode={isStealthMode} />}
            {view === 'lookup' && <SatelliteLookup initialLoc={userLoc} isStealthMode={isStealthMode} />}

            {view === 'calculations' && lookAngles && (
              <div className="max-w-4xl mx-auto space-y-6">
                <TerrainObstruction angles={lookAngles} />
                <LinkBudgetCalculator distance={lookAngles.distance} elevation={lookAngles.elevation} isStealthMode={isStealthMode} />
              </div>
            )}

            {view === 'news' && (
              <div className="max-w-4xl mx-auto">
                <RSSReader />
              </div>
            )}

            {view === 'darklink' && <DarkLink isActive={isDarkLinkActive} setIsActive={setIsDarkLinkActive} />}
          </div>
        </div>
        {showSaveToast && (
          <div className="fixed bottom-14 right-6 z-[100] border border-emerald-500/30 bg-slate-950/95 text-emerald-400 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Checkpointed to IndexedDB</span>
          </div>
        )}
      </Layout>
    </div>
  );
};

export default App;


import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { getWarGamesTurn, generateWarGamesReport } from '../services/geminiService.ts';
import { playSystemVoice } from '../services/audioService.ts';

type SimulationState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE';
type ThreatLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
type Team = 'RED' | 'BLUE' | 'SYSTEM';

interface SimulationEvent {
  id: string;
  timestamp: string;
  team: Team;
  action: string;
  rationale?: string;
}

const OBJECTIVE_PRESETS = [
    "Degrade signal link integrity below 30%.",
    "Achieve persistent unauthorized access to the terminal.",
    "Execute a successful Denial-of-Service (DoS) attack.",
    "Exfiltrate simulated sensitive data packet."
];

export const WarGamesSimulator: React.FC<{ satName: string }> = ({ satName }) => {
    const [simState, setSimState] = useState<SimulationState>('IDLE');
    const [objective, setObjective] = useState(OBJECTIVE_PRESETS[0]);
    const [eventLog, setEventLog] = useState<SimulationEvent[]>([]);
    const [linkIntegrity, setLinkIntegrity] = useState(100);
    const [threatLevel, setThreatLevel] = useState<ThreatLevel>('LOW');
    const [postActionReport, setPostActionReport] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const turnCounter = useRef(0);
    const simInterval = useRef<number | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [eventLog]);
    
    useEffect(() => {
      return () => { // Cleanup on unmount
        if (simInterval.current) clearInterval(simInterval.current);
      }
    }, []);

    const addEvent = (team: Team, action: string, rationale?: string) => {
        setEventLog(prev => [...prev, {
            id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            team,
            action,
            rationale
        }]);
    };

    const runSimulationTurn = async () => {
        if (isLoading) return;
        setIsLoading(true);
        turnCounter.current += 1;
        
        const turnData = await getWarGamesTurn(eventLog, objective);
        
        if (turnData) {
            addEvent('RED', turnData.redTeamAction.action, turnData.redTeamAction.rationale);
            addEvent('BLUE', turnData.blueTeamAction.action, turnData.blueTeamAction.rationale);
            addEvent('SYSTEM', turnData.systemStateChange.narrative);

            setLinkIntegrity(prev => Math.max(0, Math.min(100, prev + turnData.systemStateChange.link_integrity_delta)));
            setThreatLevel(turnData.systemStateChange.threat_level as ThreatLevel);

            if (turnData.isObjectiveMet || turnCounter.current >= 10 || linkIntegrity <= 0) {
                endSimulation(turnData.isObjectiveMet ? 'RED' : 'BLUE');
            }
        } else {
            addEvent('SYSTEM', "Simulation error: AI Orchestrator failed to respond.");
            endSimulation('BLUE'); // End on error
        }

        setIsLoading(false);
    };

    const startSimulation = () => {
        setSimState('RUNNING');
        setEventLog([]);
        setLinkIntegrity(100);
        setThreatLevel('LOW');
        setPostActionReport(null);
        turnCounter.current = 0;
        playSystemVoice('War Games simulation initiated.');
        addEvent('SYSTEM', `SCENARIO START: Red Team objective is to "${objective}"`);
        
        // Initial turn
        runSimulationTurn();

        simInterval.current = window.setInterval(runSimulationTurn, 6000);
    };

    const endSimulation = async (winner: 'RED' | 'BLUE') => {
        if (simInterval.current) clearInterval(simInterval.current);
        simInterval.current = null;
        setSimState('COMPLETE');
        playSystemVoice(`Simulation complete. Winner: ${winner} Team.`);
        addEvent('SYSTEM', `SIMULATION END: ${winner} TEAM WINS. Generating Post-Action Report...`);
        
        setIsLoading(true);
        const report = await generateWarGamesReport(eventLog, objective);
        setPostActionReport(report);
        setIsLoading(false);
    };

    const handleReset = () => {
        if (simInterval.current) clearInterval(simInterval.current);
        simInterval.current = null;
        setSimState('IDLE');
        setEventLog([]);
        setPostActionReport(null);
    };
    
    const getThreatColor = (level: ThreatLevel) => {
      switch(level) {
        case 'LOW': return 'text-cyan-400';
        case 'ELEVATED': return 'text-yellow-400';
        case 'HIGH': return 'text-orange-500';
        case 'CRITICAL': return 'text-red-500';
      }
    };

    const handleDownloadSimData = () => {
        if (eventLog.length === 0 && !postActionReport) return;
        
        let fileContent = `--- STIA WAR GAMES ENGAGEMENT REPORT ---\n`;
        fileContent += `TIMESTAMP: ${new Date().toLocaleString()}\n`;
        fileContent += `RED TEAM OBJECTIVE: ${objective}\n`;
        fileContent += `FINAL METRICS - Link Integrity: ${linkIntegrity.toFixed(1)}%, Threat Level: ${threatLevel}\n`;
        fileContent += `--------------------------------------------------\n\n`;

        if (postActionReport) {
            fileContent += `=== POST-ACTION AUDIT REPORT ===\n\n${postActionReport}\n\n`;
        }

        fileContent += `=== DETAILED CHRONOLOGICAL COMBAT EVENTS FEED ===\n\n`;
        eventLog.forEach(log => {
            fileContent += `[${log.timestamp}] ${log.team}: ${log.action}\n`;
            if (log.rationale) {
                fileContent += `   -> Rationale: ${log.rationale}\n`;
            }
        });

        const blob = new Blob([fileContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `WAR_GAMES_REPORT_${new Date().getTime()}.md`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
            {/* Control & Status */}
            <div className="lg:col-span-1 space-y-6">
                <div className="glass p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Simulation Control</h3>
                    {simState === 'IDLE' && (
                        <div className="space-y-4">
                             <label className="block text-[9px] font-bold text-slate-500 uppercase">Red Team Objective</label>
                             <select value={objective} onChange={e => setObjective(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white mono outline-none focus:border-cyan-500 cursor-pointer">
                                {OBJECTIVE_PRESETS.map(op => <option key={op} value={op}>{op}</option>)}
                             </select>
                            <button onClick={startSimulation} className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl uppercase tracking-widest text-xs">
                                Initiate Simulation
                            </button>
                        </div>
                    )}
                    {simState !== 'IDLE' && (
                         <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-[9px] font-bold text-slate-500 uppercase">Status</p>
                                <p className={`text-lg font-bold mono ${simState === 'RUNNING' ? 'text-green-400 animate-pulse' : 'text-slate-400'}`}>{simState}</p>
                            </div>
                            <button onClick={handleReset} className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 font-bold py-3 rounded-xl uppercase tracking-widest text-xs">
                                Terminate & Reset
                            </button>
                        </div>
                    )}
                </div>
                <div className="glass p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Link Status: <span className="text-cyan-400">{satName}</span></h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-[9px] font-bold mono text-slate-500 mb-1"><span>Link Integrity</span><span>{linkIntegrity.toFixed(1)}%</span></div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full transition-all duration-500 ${linkIntegrity < 30 ? 'bg-red-600' : linkIntegrity < 60 ? 'bg-amber-500' : 'bg-cyan-600'}`} style={{ width: `${linkIntegrity}%` }}></div>
                            </div>
                        </div>
                         <div>
                            <div className="flex justify-between text-[9px] font-bold mono text-slate-500 mb-1"><span>Threat Level</span><span className={getThreatColor(threatLevel)}>{threatLevel}</span></div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden shadow-inner flex">
                                <div className={`h-full transition-all duration-500 ${(getThreatColor(threatLevel) || '').replace('text-','bg-')}`} style={{ width: `${threatLevel === 'LOW' ? 25 : threatLevel === 'ELEVATED' ? 50 : threatLevel === 'HIGH' ? 75 : 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Main Feed / Report */}
            <div className="lg:col-span-2 glass p-4 rounded-2xl border border-slate-800 flex flex-col min-h-[500px]">
                {simState !== 'COMPLETE' ? (
                  <>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Combat Feed</h3>
                        {eventLog.length > 0 && (
                            <button onClick={handleDownloadSimData} className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all shadow-md">EXPORT_WAR_LOG</button>
                        )}
                    </div>
                    <div ref={logRef} className="flex-grow overflow-y-auto h-96 scrollbar-hide bg-slate-950/50 rounded-lg p-3 space-y-3">
                        {eventLog.map(log => (
                            <div key={log.id} className="text-[10px] mono">
                               <div className={`flex items-start space-x-2 p-2 rounded-lg ${log.team === 'SYSTEM' ? '' : 'bg-slate-900/50'}`}>
                                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                  <div className="flex-grow">
                                    <span className={`font-bold ${log.team === 'RED' ? 'text-red-500' : log.team === 'BLUE' ? 'text-cyan-400' : 'text-slate-500'}`}>
                                       {log.team}:
                                    </span>
                                    <span className="text-slate-300 ml-1">{log.action}</span>
                                    {log.rationale && <p className="text-[9px] text-slate-500 italic mt-1 pl-4 border-l border-slate-800">
                                        Rationale: {log.rationale}
                                    </p>}
                                  </div>
                               </div>
                            </div>
                        ))}
                         {isLoading && simState === 'RUNNING' && <div className="text-cyan-500 text-[10px] mono animate-pulse">ORCHESTRATOR IS THINKING...</div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Post-Action Report</h3>
                        <button onClick={handleDownloadSimData} className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all shadow-md">DOWNLOAD_AAR</button>
                    </div>
                    <div className="flex-grow overflow-y-auto scrollbar-hide bg-slate-950/50 rounded-lg p-4">
                        {isLoading ? (
                            <div className="text-cyan-500 text-[10px] mono animate-pulse">GENERATING REPORT...</div>
                        ) : (
                           <pre className="text-xs text-slate-300 mono whitespace-pre-wrap leading-relaxed">{postActionReport}</pre>
                        )}
                    </div>
                  </>
                )}
            </div>
        </div>
    );

};
